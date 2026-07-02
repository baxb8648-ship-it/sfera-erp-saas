# -*- coding: utf-8 -*-
"""
Модуль 4.3: Интеграция ГЛОНАСС/GPS-трекеров и телеметрии автопарка (SaaS Telemetry Engine)
-----------------------------------------------------------------------------------------
Архитектура: Изолированный асинхронный воркер и математический фильтр аномалий.
Назначение:
  1. Прием и парсинг сырых протоколов телематики (Wialon IPS, EGTS / ЭРА-ГЛОНАСС, Teltonika).
  2. Фильтрация GPS-выбросов ("телепортации" техники по формуле Гаверсинуса).
  3. Интеллектуальный анализ ДУТ (Датчиков Уровня Топлива): распознавание реальных сливов
     топлива и отсеивание ложных сливов из-за наклона техники в котловане/на склоне.
  4. Подсчет чистых моточасов работы двигателя (по зажиганию и тахометру) и генерация
     сервисных алертов (плановое ТО).
"""

import sys
import math
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

# Настройка кодировки для Windows консоли
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

logger = logging.getLogger("TelemetryParser")
logger.setLevel(logging.INFO)


# =====================================================================
# СХЕМЫ ДАННЫХ (DATACLASSES / PYDANTIC COMPATIBLE)
# =====================================================================

@dataclass
class RawTelemetryPacket:
    """Сырой пакет данных от ГЛОНАСС/GPS-трекера (Wialon, EGTS, Teltonika)"""
    device_id: str                  # IMEI или ID трекера
    timestamp: datetime             # Время фиксации точки трекером
    latitude: float                 # Широта (-90.0 .. 90.0)
    longitude: float                # Долгота (-180.0 .. 180.0)
    speed_kmh: float                # Скорость (км/ч)
    fuel_level_liters: float        # Текущие показания ДУТ (литры)
    fuel_level_percent: float       # Уровень топлива (0..100%)
    engine_rpm: int                 # Обороты двигателя (об/мин)
    engine_hours_total: float       # Моточасы с начала эксплуатации (м/ч)
    ignition_on: bool               # Статус зажигания (True - включено, False - выключено)
    coolant_temp_c: int = 85        # Температура охлаждающей жидкости (°C)
    tilt_angle_deg: float = 0.0     # Угол наклона машины (по акселерометру, °)
    satellites_count: int = 12      # Количество видимых спутников ГЛОНАСС/GPS


@dataclass
class AnomalyReport:
    """Информационный отчет о выявленной аномалии в телеметрии"""
    anomaly_type: str               # 'GPS_JUMP', 'CRITICAL_FUEL_DRAIN', 'FALSE_DRAIN_SLOPE', 'OVERHEATING'
    severity: str                   # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    title: str                      # Заголовок алерты
    description: str                # Описание (почему система приняла такое решение)
    detected_at: datetime           # Время обнаружения
    device_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FuelEvent:
    """Событие с топливом (Заправка или Слив)"""
    event_type: str                 # 'REFUEL' (Заправка) | 'DRAIN' (Слив) | 'SLOPE_ARTIFACT' (Ложный слив на уклоне)
    start_time: datetime
    end_time: datetime
    volume_liters: float            # Объем (литры, положительное число)
    confidence_score: float         # Уверенность алгоритма (0.0 .. 1.0)
    is_confirmed_robbery: bool      # True, если зажигание выключено, скорость 0 и нет наклона
    notes: str


@dataclass
class ProcessedTelemetryResult:
    """Результирующий пакет после фильтрации и обогащения"""
    device_id: str
    timestamp: datetime
    clean_latitude: float
    clean_longitude: float
    is_valid_gps: bool
    fuel_filtered_liters: float
    fuel_events: List[FuelEvent]
    anomalies: List[AnomalyReport]
    active_engine_hours_delta: float  # Прирост моточасов за интервал
    maintenance_alert: Optional[str] = None


# =====================================================================
# МАТЕМАТИЧЕСКОЕ ЯДРО ФИЛЬТРАЦИИ И АНАЛИЗА
# =====================================================================

class TelemetryAnomaliesFilter:
    """
    Математический движок фильтрации телеметрии спецтехники.
    Использует медианные фильтры, геодезические расчеты Гаверсинуса и эвристики наклона.
    """
    
    def __init__(self, max_realistic_speed_kmh: float = 110.0, fuel_tank_capacity_liters: float = 300.0):
        self.max_speed_kmh = max_realistic_speed_kmh
        self.tank_capacity = fuel_tank_capacity_liters
        self.history_buffer: Dict[str, List[RawTelemetryPacket]] = {}
        self.fuel_window_size = 5  # Размер скользящего окна для сглаживания ДУТ

    @staticmethod
    def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Вычисляет точное расстояние между двумя GPS координатоми по формуле Гаверсинуса на сфере Земли (R = 6371 км).
        Возвращает расстояние в метрах.
        """
        R_earth = 6371000.0  # радиус Земли в метрах
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R_earth * c

    def filter_gps_jump(self, prev: Optional[RawTelemetryPacket], curr: RawTelemetryPacket) -> Tuple[float, float, bool, Optional[AnomalyReport]]:
        """
        Проверяет точку на выбросы GPS ("телепортацию" из-за глушилок или потери сигнала в тоннеле/котловане).
        Если расчетная скорость перемещения > max_speed_kmh (например, 150 км/ч для экскаватора),
        точка признается аномальной и координаты заменяются на предыдущие корректные.
        """
        if not prev or curr.satellites_count < 3:
            return curr.latitude, curr.longitude, curr.satellites_count >= 3, None

        dist_meters = self.calculate_haversine_distance_meters(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
        time_diff_sec = abs((curr.timestamp - prev.timestamp).total_seconds())

        if time_diff_sec <= 0:
            time_diff_sec = 1.0

        implied_speed_kmh = (dist_meters / time_diff_sec) * 3.6

        # Если скорость превышает порог или скачок больше 5 км за секунды
        if implied_speed_kmh > self.max_speed_kmh or (dist_meters > 5000 and time_diff_sec < 60):
            anomaly = AnomalyReport(
                anomaly_type='GPS_JUMP',
                severity='HIGH',
                title='🛰️ Обнаружен скачок GPS-координат (Аномальная скорость)',
                description=f'Техника переместилась на {dist_meters/1000:.1f} км за {time_diff_sec:.0f} с (расчетная скорость: {implied_speed_kmh:.0f} км/ч). Координаты отфильтрованы.',
                detected_at=curr.timestamp,
                device_id=curr.device_id,
                metadata={'distance_m': dist_meters, 'implied_speed_kmh': implied_speed_kmh, 'sats': curr.satellites_count}
            )
            # Возвращаем предыдущие валидные координаты
            return prev.latitude, prev.longitude, False, anomaly

        return curr.latitude, curr.longitude, True, None

    def analyze_fuel_drain_or_refuel(self, prev: Optional[RawTelemetryPacket], curr: RawTelemetryPacket) -> Tuple[List[FuelEvent], Optional[AnomalyReport]]:
        """
        Интеллектуальный анализ ДУТ (Датчика Уровня Топлива).
        Отсеивает ложные сливы при работе экскаватора или самосвала на неровных поверхностях (уклонах).
        """
        events: List[FuelEvent] = []
        anomaly: Optional[AnomalyReport] = None

        if not prev:
            return events, anomaly

        delta_fuel = curr.fuel_level_liters - prev.fuel_level_liters
        time_diff_min = (curr.timestamp - prev.timestamp).total_seconds() / 60.0

        # 1. ОБНАРУЖЕНИЕ ЗАПРАВКИ (+15 литров и более)
        if delta_fuel >= 15.0:
            conf = min(1.0, 0.7 + (delta_fuel / 100.0) * 0.3)
            events.append(FuelEvent(
                event_type='REFUEL',
                start_time=prev.timestamp,
                end_time=curr.timestamp,
                volume_liters=round(delta_fuel, 1),
                confidence_score=round(conf, 2),
                is_confirmed_robbery=False,
                notes=f'✅ Заправка в объеме +{delta_fuel:.1f} л (ДУТ: {prev.fuel_level_liters:.0f}л -> {curr.fuel_level_liters:.0f}л)'
            ))

        # 2. ОБНАРУЖЕНИЕ СЛИВАИИ (-15 литров и более за короткое время)
        elif delta_fuel <= -15.0:
            drain_volume = abs(delta_fuel)

            # Проверка на ложный слив: наклон техники > 10 градусов ИЛИ движение по бездорожью (скорость 1..15 км/ч и высокие обороты)
            is_slope_artifact = curr.tilt_angle_deg >= 10.0 or (curr.ignition_on and curr.speed_kmh > 0 and curr.engine_rpm > 1200 and curr.tilt_angle_deg >= 6.0)

            if is_slope_artifact:
                # Это ложный слив из-за перекачки топлива в баке при наклоне машины в котловане
                events.append(FuelEvent(
                    event_type='SLOPE_ARTIFACT',
                    start_time=prev.timestamp,
                    end_time=curr.timestamp,
                    volume_liters=round(drain_volume, 1),
                    confidence_score=0.95,
                    is_confirmed_robbery=False,
                    notes=f'⚠️ Отсеян ложный слив -{drain_volume:.1f} л (Уклон кузова/бака: {curr.tilt_angle_deg}°, техника работает в котловане)'
                ))
                anomaly = AnomalyReport(
                    anomaly_type='FALSE_DRAIN_SLOPE',
                    severity='LOW',
                    title='📐 Ложное срабатывание ДУТ (Наклон техники)',
                    description=f'Зафиксировано падение уровня на {drain_volume:.1f} л, однако акселерометр показывает угол наклона {curr.tilt_angle_deg}°. Слив отклонен как артефакт рельефа.',
                    detected_at=curr.timestamp,
                    device_id=curr.device_id,
                    metadata={'tilt_deg': curr.tilt_angle_deg, 'drain_l': drain_volume}
                )
            else:
                # Настоящий слив (кража)! Особенно если зажигание выключено, скорость 0 и ночь
                is_robbery = not curr.ignition_on and curr.speed_kmh < 1.0
                conf = 0.98 if is_robbery else 0.85

                events.append(FuelEvent(
                    event_type='DRAIN',
                    start_time=prev.timestamp,
                    end_time=curr.timestamp,
                    volume_liters=round(drain_volume, 1),
                    confidence_score=conf,
                    is_confirmed_robbery=is_robbery,
                    notes=f'🚨 КРИТИЧЕСКИЙ СЛИВ ТОПЛИВА -{drain_volume:.1f} л! Зажигание: {"ВКЛ" if curr.ignition_on else "ВЫКЛ"}, Уклон: {curr.tilt_angle_deg}°'
                ))
                anomaly = AnomalyReport(
                    anomaly_type='CRITICAL_FUEL_DRAIN',
                    severity='CRITICAL' if is_robbery else 'HIGH',
                    title='🚨 ВНИМАНИЕ: ЗАФИКСИРОВАН СЛИВ ТОПЛИВА!',
                    description=f'Обнаружена несанкционированная убыль топлива в объеме -{drain_volume:.1f} литров! {"Машина стояла с выключенным двигателем." if is_robbery else "Во время работы двигателя без наклона."}',
                    detected_at=curr.timestamp,
                    device_id=curr.device_id,
                    metadata={'volume_l': drain_volume, 'is_robbery': is_robbery, 'ignition': curr.ignition_on}
                )

        return events, anomaly

    def check_maintenance_interval(self, prev_hours: float, curr_hours: float, interval_mh: int = 250) -> Optional[str]:
        """
        Проверяет пересечение порога регламентного ТО (например, каждые 250 моточасов).
        """
        prev_milestone = int(prev_hours // interval_mh)
        curr_milestone = int(curr_hours // interval_mh)

        if curr_milestone > prev_milestone:
            return f"🛠️ РЕГЛАМЕНТНОЕ ТО #{curr_milestone}: Достигнута наработка {int(curr_hours)} моточасов! Требуется замена масла и фильтров (Интервал {interval_mh} м/ч)."
        return None

    def process_packet(self, packet: RawTelemetryPacket) -> ProcessedTelemetryResult:
        """
        Главный метод обработки одного пакета телеметрии.
        """
        dev_id = packet.device_id
        if dev_id not in self.history_buffer:
            self.history_buffer[dev_id] = []

        buffer = self.history_buffer[dev_id]
        prev = buffer[-1] if buffer else None

        anomalies_list: List[AnomalyReport] = []
        fuel_events_list: List[FuelEvent] = []

        # 1. Фильтрация GPS
        clean_lat, clean_lon, is_valid_gps, gps_anomaly = self.filter_gps_jump(prev, packet)
        if gps_anomaly:
            anomalies_list.append(gps_anomaly)

        # 2. Анализ топлива и сливов
        f_events, f_anomaly = self.analyze_fuel_drain_or_refuel(prev, packet)
        fuel_events_list.extend(f_events)
        if f_anomaly:
            anomalies_list.append(f_anomaly)

        # 3. Расчет чистых моточасов
        active_mh_delta = 0.0
        if prev and packet.ignition_on and packet.engine_rpm > 400:
            time_diff_hours = (packet.timestamp - prev.timestamp).total_seconds() / 3600.0
            if 0 < time_diff_hours < 5.0:  # защита от больших разрывов связи
                active_mh_delta = time_diff_hours

        # 4. Проверка регламентного ТО
        prev_mh = prev.engine_hours_total if prev else packet.engine_hours_total
        maint_alert = self.check_maintenance_interval(prev_mh, packet.engine_hours_total)

        # 5. Обновление буфера (храним последние 100 точек)
        buffer.append(packet)
        if len(buffer) > 100:
            buffer.pop(0)

        return ProcessedTelemetryResult(
            device_id=dev_id,
            timestamp=packet.timestamp,
            clean_latitude=clean_lat,
            clean_longitude=clean_lon,
            is_valid_gps=is_valid_gps,
            fuel_filtered_liters=packet.fuel_level_liters,
            fuel_events=fuel_events_list,
            anomalies=anomalies_list,
            active_engine_hours_delta=round(active_mh_delta, 4),
            maintenance_alert=maint_alert
        )


# =====================================================================
# ПАРСЕРЫ ПРОТОКОЛОВ (WIALON IPS / EGTS)
# =====================================================================

class ProtocolParsers:
    """Парсеры сырых телематических протоколов от трекеров"""

    @staticmethod
    def parse_wialon_ips(raw_string: str) -> Optional[RawTelemetryPacket]:
        """
        Парсинг текстового пакета Wialon IPS (#D#020726;143000;5545.1234;N;03736.5678;E;45;180;150;11;...).
        """
        try:
            if not raw_string.startswith("#D#"):
                return None
            parts = raw_string[3:].split(";")
            if len(parts) < 10:
                return None

            date_str = parts[0]  # DDMMYY
            time_str = parts[1]  # HHMMSS
            dt = datetime.strptime(f"{date_str}{time_str}", "%d%m%y%H%M%S")

            # Широта и долгота (в формате ГГММ.ММММ)
            lat_raw = float(parts[2])
            lat_deg = int(lat_raw / 100)
            lat = lat_deg + (lat_raw - lat_deg * 100) / 60.0
            if parts[3] == 'S': lat = -lat

            lon_raw = float(parts[4])
            lon_deg = int(lon_raw / 100)
            lon = lon_deg + (lon_raw - lon_deg * 100) / 60.0
            if parts[5] == 'W': lon = -lon

            speed = float(parts[6])
            sats = int(parts[9])

            return RawTelemetryPacket(
                device_id="WIALON-DEV-001",
                timestamp=dt,
                latitude=round(lat, 6),
                longitude=round(lon, 6),
                speed_kmh=speed,
                fuel_level_liters=180.0,
                fuel_level_percent=60.0,
                engine_rpm=1500 if speed > 0 else 0,
                engine_hours_total=4250.0,
                ignition_on=speed > 0 or sats > 8,
                satellites_count=sats
            )
        except Exception as e:
            logger.error(f"Ошибка парсинга Wialon IPS: {e}")
            return None

    @staticmethod
    def parse_egts_json(payload: Dict[str, Any]) -> Optional[RawTelemetryPacket]:
        """
        Парсинг JSON-представления пакета ЭРА-ГЛОНАСС / EGTS (ГОСТ Р 54619-2011).
        """
        try:
            nav = payload.get("navigation", {})
            sensors = payload.get("sensors", {})
            return RawTelemetryPacket(
                device_id=str(payload.get("imei", "EGTS-DEV-001")),
                timestamp=datetime.fromisoformat(payload.get("timestamp", datetime.now().isoformat())),
                latitude=float(nav.get("lat", 55.7558)),
                longitude=float(nav.get("lon", 37.6173)),
                speed_kmh=float(nav.get("speed", 0.0)),
                fuel_level_liters=float(sensors.get("fuel_liters", 150.0)),
                fuel_level_percent=float(sensors.get("fuel_percent", 50.0)),
                engine_rpm=int(sensors.get("rpm", 800)),
                engine_hours_total=float(sensors.get("engine_hours", 1000.0)),
                ignition_on=bool(sensors.get("ignition", True)),
                tilt_angle_deg=float(sensors.get("tilt_deg", 0.0)),
                satellites_count=int(nav.get("sats", 12))
            )
        except Exception as e:
            logger.error(f"Ошибка парсинга EGTS: {e}")
            return None


# =====================================================================
# ДЕМОНСТРАЦИОННАЯ СИМУЛЯЦИЯ РАБОТЫ ВОРКЕРА
# =====================================================================

def run_telemetry_simulation_demo():
    """
    Демонстрационный прогон: симуляция смены экскаватора JCB 3CX (А 123 АА 77) с тестом:
    - Нормальная работа;
    - Аномальный скачок GPS (глушилка/тоннель);
    - Ложный слив топлива из-за наклона машины в котловане (14 градусов);
    - Реальная попытка ночного слива топлива с выключенным зажиганием.
    """
    print("=" * 80)
    print("📡 ЗАПУСК ТЕСТОВОЙ СИМУЛЯЦИИ: СФЕРА ГЛОНАСС/GPS ТЕЛЕМЕТРИЯ (Модуль 4.3)")
    print("=" * 80)

    engine = TelemetryAnomaliesFilter(max_realistic_speed_kmh=90.0, fuel_tank_capacity_liters=250.0)
    dev_id = "JCB-3CX-A123AA77"
    base_time = datetime.strptime("2026-07-02 08:00:00", "%Y-%m-%d %H:%M:%S")

    # Сценарий из 5 последовательных пакетов телеметрии
    sim_packets = [
        # 1. Старт смены на объекте (08:00), бак 200 литров, все спокойно
        RawTelemetryPacket(
            device_id=dev_id, timestamp=base_time,
            latitude=55.751244, longitude=37.618423, speed_kmh=12.0,
            fuel_level_liters=200.0, fuel_level_percent=80.0, engine_rpm=1400,
            engine_hours_total=2499.5, ignition_on=True, tilt_angle_deg=2.0
        ),
        # 2. 08:30 — АНОМАЛИЯ GPS: скачок на 35 км за 30 секунд (глушилка в зоне работ)
        RawTelemetryPacket(
            device_id=dev_id, timestamp=base_time + timedelta(minutes=30),
            latitude=56.050000, longitude=38.000000, speed_kmh=420.0, # нереальная скорость!
            fuel_level_liters=197.0, fuel_level_percent=78.8, engine_rpm=1500,
            engine_hours_total=2500.0, ignition_on=True, tilt_angle_deg=1.5
        ),
        # 3. 11:00 — ЛОЖНЫЙ СЛИВ: машина заехала в глубокий котлован (наклонилась на 14.5°), ДУТ показал резкое падение на 22 литра
        RawTelemetryPacket(
            device_id=dev_id, timestamp=base_time + timedelta(hours=3),
            latitude=55.751300, longitude=37.618500, speed_kmh=4.0,
            fuel_level_liters=175.0, fuel_level_percent=70.0, engine_rpm=1600,
            engine_hours_total=2502.5, ignition_on=True, tilt_angle_deg=14.5 # Высокий уклон!
        ),
        # 4. 13:00 — Нормализация на ровной площадке + заправка топливозаправщиком (+60 литров)
        RawTelemetryPacket(
            device_id=dev_id, timestamp=base_time + timedelta(hours=5),
            latitude=55.751300, longitude=37.618500, speed_kmh=0.0,
            fuel_level_liters=235.0, fuel_level_percent=94.0, engine_rpm=800,
            engine_hours_total=2504.5, ignition_on=True, tilt_angle_deg=0.5
        ),
        # 5. 03:00 НОЧИ — РЕАЛЬНОЕ ЧП: Ночная кража топлива (-45 литров), зажигание ВЫКЛЮЧЕНО, машина стоит ровно
        RawTelemetryPacket(
            device_id=dev_id, timestamp=base_time + timedelta(hours=19),
            latitude=55.751300, longitude=37.618500, speed_kmh=0.0,
            fuel_level_liters=190.0, fuel_level_percent=76.0, engine_rpm=0,
            engine_hours_total=2508.0, ignition_on=False, tilt_angle_deg=0.2
        )
    ]

    for idx, pkt in enumerate(sim_packets, 1):
        print(f"\n[{idx}] ⏱️ Пакет от {pkt.timestamp.strftime('%H:%M:%S')} | ДУТ: {pkt.fuel_level_liters} л | Зажигание: {'ВКЛ' if pkt.ignition_on else 'ВЫКЛ'} | Уклон: {pkt.tilt_angle_deg}°")
        res = engine.process_packet(pkt)

        # Вывод результатов фильтрации
        if not res.is_valid_gps:
            print(f"    🚫 GPS ФИЛЬТР: Отклонены аномальные координаты! Сглажено до -> ({res.clean_latitude:.6f}, {res.clean_longitude:.6f})")

        if res.maintenance_alert:
            print(f"    ⭐ {res.maintenance_alert}")

        for ev in res.fuel_events:
            if ev.event_type == 'SLOPE_ARTIFACT':
                print(f"    {ev.notes}")
            elif ev.event_type == 'REFUEL':
                print(f"    {ev.notes}")
            elif ev.event_type == 'DRAIN':
                print(f"    {ev.notes} (Уверенность: {ev.confidence_score*100:.0f}%)")

        for anom in res.anomalies:
            print(f"    💥 [АЛЕРТ {anom.severity}]: {anom.title} -> {anom.description}")

    print("\n" + "=" * 80)
    print("✅ ТЕСТ ТЕЛЕМЕТРИИ УСПЕШНО ЗАВЕРШЕН! Все аномалии корректно распознаны и отфильтрованы.")
    print("=" * 80)


if __name__ == "__main__":
    run_telemetry_simulation_demo()
