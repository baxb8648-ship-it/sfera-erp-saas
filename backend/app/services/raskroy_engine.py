# -*- coding: utf-8 -*-
"""
Математический движок 2D-раскроя плитных материалов (Модуль 4.2 Мебель).
Вдохновлен алгоритмами профессиональных систем раскроя (например, SketchCut Pro, Базис-Раскрой).

Реализует гильотиновое упаковывание прямоугольников (2D Guillotine Bin-Packing)
с поддержкой:
- Толщины пильного реза (пропил / kerf width, обычно 4 мм).
- Подрезки краев листа по периметру (edge trim / опиловка кромки).
- Контроля вращения деталей по волокнам древесины (с текстурой / без текстуры).
- Расчета полезного выхода (Yield %) и процента отходов (Waste %).
- Определения деловых остатков (reusable offcuts) для повторного использования.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple
import json
import copy
import sys


@dataclass
class SheetSpec:
    """Параметры исходного листа материала (ДСП, ЛДСП, МДФ, Фанера)."""
    width: float = 2800.0       # Длина листа (мм)
    height: float = 2070.0      # Ширина листа (мм)
    thickness: float = 16.0     # Толщина (мм)
    kerf: float = 4.0           # Толщина пропила пилы (мм)
    trim_top: float = 10.0      # Опиловка кромки сверху (мм)
    trim_bottom: float = 10.0   # Опиловка кромки снизу (мм)
    trim_left: float = 10.0     # Опиловка кромки слева (мм)
    trim_right: float = 10.0    # Опиловка кромки справа (мм)
    material_name: str = "ЛДСП 16мм стандарт"

    @property
    def usable_width(self) -> float:
        return max(0.0, self.width - self.trim_left - self.trim_right)

    @property
    def usable_height(self) -> float:
        return max(0.0, self.height - self.trim_top - self.trim_bottom)

    @property
    def total_area(self) -> float:
        return self.width * self.height


@dataclass
class PartSpec:
    """Спецификация требуемой детали для раскроя."""
    part_id: str                # Уникальный идентификатор или артикул
    name: str                   # Название детали (например, "Боковина шкафа левая")
    width: float                # Длина (вдоль волокон, если текстура важна)
    height: float               # Ширина (поперек волокон)
    count: int = 1              # Требуемое количество
    can_rotate: bool = False    # Можно ли вращать на 90° (False = текстура направленная)
    edge_banding: str = ""      # Обозначение кромки (например, "0.4/0.4/2.0/0.0")
    notes: str = ""             # Примечания

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class PlacedPart:
    """Деталь, размещенная на карте раскроя листа."""
    part_id: str
    name: str
    x: float                    # Координата X левого верхнего угла (с учетом trim_left)
    y: float                    # Координата Y левого верхнего угла (с учетом trim_top)
    width: float                # Фактическая ширина размещения (с учетом вращения)
    height: float               # Фактическая высота размещения (с учетом вращения)
    rotated: bool               # Была ли повернута на 90°
    edge_banding: str = ""

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class FreeRect:
    """Свободная прямоугольная область на листе, доступная для размещения."""
    x: float
    y: float
    width: float
    height: float

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class Offcut:
    """Остаток материала на листе (обрезок)."""
    x: float
    y: float
    width: float
    height: float
    is_reusable: bool           # Является ли "деловым остатком" (пригодным для будущих заказов)

    @property
    def area(self) -> float:
        return self.width * self.height


@dataclass
class SheetResult:
    """Результат раскроя одного листа."""
    sheet_index: int
    sheet_spec: SheetSpec
    placed_parts: List[PlacedPart] = field(default_factory=list)
    offcuts: List[Offcut] = field(default_factory=list)
    total_area: float = 0.0
    used_area: float = 0.0
    waste_area: float = 0.0
    yield_percentage: float = 0.0
    waste_percentage: float = 0.0
    reusable_offcuts_count: int = 0
    total_cut_length: float = 0.0

    def calculate_metrics(self, min_reusable_side: float = 400.0, min_reusable_area: float = 200000.0):
        self.total_area = self.sheet_spec.total_area
        self.used_area = sum(p.area for p in self.placed_parts)
        
        # Определяем деловые остатки
        self.reusable_offcuts_count = 0
        for off in self.offcuts:
            if (off.width >= min_reusable_side and off.height >= min_reusable_side) or (off.area >= min_reusable_area and min(off.width, off.height) >= 200.0):
                off.is_reusable = True
                self.reusable_offcuts_count += 1
            else:
                off.is_reusable = False

        self.waste_area = max(0.0, self.total_area - self.used_area)
        if self.total_area > 0:
            self.yield_percentage = round((self.used_area / self.total_area) * 100.0, 2)
            self.waste_percentage = round((self.waste_area / self.total_area) * 100.0, 2)
        else:
            self.yield_percentage = 0.0
            self.waste_percentage = 0.0

        # Оценка общей длины резов (гильотины по границам деталей)
        cut_len = 0.0
        for p in self.placed_parts:
            cut_len += (p.width + p.height)
        self.total_cut_length = round(cut_len, 1)


@dataclass
class OptimizationResult:
    """Итоговый результат расчета всего заказа раскроя."""
    total_sheets_used: int
    sheets: List[SheetResult] = field(default_factory=list)
    unplaced_parts: List[PartSpec] = field(default_factory=list)
    summary_yield_pct: float = 0.0
    summary_waste_pct: float = 0.0
    total_parts_placed: int = 0
    total_reusable_offcuts: int = 0
    material_name: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Сериализация результата в словарь (для отправки через API или рендеринга на фронтенде)."""
        return {
            "total_sheets_used": self.total_sheets_used,
            "material_name": self.material_name,
            "summary_yield_pct": self.summary_yield_pct,
            "summary_waste_pct": self.summary_waste_pct,
            "total_parts_placed": self.total_parts_placed,
            "total_reusable_offcuts": self.total_reusable_offcuts,
            "unplaced_parts": [asdict(p) for p in self.unplaced_parts],
            "sheets": [
                {
                    "sheet_index": s.sheet_index,
                    "yield_percentage": s.yield_percentage,
                    "waste_percentage": s.waste_percentage,
                    "reusable_offcuts_count": s.reusable_offcuts_count,
                    "total_cut_length_mm": s.total_cut_length,
                    "placed_parts": [asdict(p) for p in s.placed_parts],
                    "offcuts": [asdict(o) for o in s.offcuts]
                }
                for s in self.sheets
            ]
        }

    def to_json(self, indent: int = 2) -> str:
        """Экспорт результата в JSON."""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)


class RaskroyOptimizer:
    """
    Математический движок оптимизации раскроя (Guillotine 2D Bin-Packing).
    Использует эвристику Best Area Fit (BAF) и Guillotine Split (Shorter Leftover Axis / MAX AS).
    """

    def __init__(self, sheet_spec: SheetSpec, min_reusable_side: float = 400.0):
        self.sheet_spec = sheet_spec
        self.min_reusable_side = min_reusable_side

    def optimize(self, parts_list: List[PartSpec]) -> OptimizationResult:
        """
        Главный метод расчета раскроя.
        Принимает список деталей (с учетом поля count), возвращает раскроенные листы и статистику.
        """
        # 1. Разворачиваем список деталей согласно количеству (count)
        expanded_parts: List[Tuple[PartSpec, int]] = []
        for p in parts_list:
            for idx in range(p.count):
                expanded_parts.append((p, idx + 1))

        # 2. Сортируем детали по убыванию площади, а при равенстве — по длине наибольшей стороны
        # Это классическая эвристика: крупные детали упаковываются первыми, мелкие заполняют пустоты.
        expanded_parts.sort(
            key=lambda item: (item[0].area, max(item[0].width, item[0].height)),
            reverse=True
        )

        sheets: List[SheetResult] = []
        unplaced: List[PartSpec] = []
        current_sheet_idx = 1
        current_free_rects: List[FreeRect] = []
        current_placed: List[PlacedPart] = []

        # Функция инициализации нового листа
        def start_new_sheet(idx: int) -> List[FreeRect]:
            # Свободная область — это лист минус отступы опиловки по краям
            initial_rect = FreeRect(
                x=self.sheet_spec.trim_left,
                y=self.sheet_spec.trim_top,
                width=self.sheet_spec.usable_width,
                height=self.sheet_spec.usable_height
            )
            return [initial_rect] if initial_rect.width > 0 and initial_rect.height > 0 else []

        current_free_rects = start_new_sheet(current_sheet_idx)

        # 3. Упаковываем каждую деталь
        for part, inst_num in expanded_parts:
            # Проверяем, не превышает ли деталь вообще габариты листа
            max_part_side = max(part.width, part.height)
            min_part_side = min(part.width, part.height)
            max_sheet_side = max(self.sheet_spec.usable_width, self.sheet_spec.usable_height)
            min_sheet_side = min(self.sheet_spec.usable_width, self.sheet_spec.usable_height)

            if min_part_side > min_sheet_side or max_part_side > max_sheet_side:
                # Деталь физически не поместится ни на один лист
                unplaced.append(part)
                continue

            # Ищем лучшее место на текущем листе
            placed, rect_idx, is_rotated = self._find_best_fit(part, current_free_rects)

            if placed is None:
                # Не поместилась на текущем листе -> закрываем лист, открываем новый!
                if current_placed or current_free_rects:
                    sheet_res = self._finalize_sheet(current_sheet_idx, current_placed, current_free_rects)
                    sheets.append(sheet_res)

                current_sheet_idx += 1
                current_free_rects = start_new_sheet(current_sheet_idx)
                current_placed = []

                # Повторно пробуем разместить на новом чистом листе
                placed, rect_idx, is_rotated = self._find_best_fit(part, current_free_rects)

                if placed is None:
                    # Даже на новом листе не поместилась (аномалия габаритов)
                    unplaced.append(part)
                    continue

            # Добавляем деталь на лист
            current_placed.append(placed)

            # Выполняем гильотиновое разделение (Guillotine Split) выбранного свободного прямоугольника
            chosen_rect = current_free_rects.pop(rect_idx)
            new_rects = self._split_guillotine(chosen_rect, placed.width, placed.height, self.sheet_spec.kerf)
            current_free_rects.extend(new_rects)

            # Удаляем нулевые или слишком мелкие свободные зоны (< 10 мм)
            current_free_rects = [r for r in current_free_rects if r.width >= 10.0 and r.height >= 10.0]

        # Закрываем последний лист
        if current_placed or current_free_rects:
            sheet_res = self._finalize_sheet(current_sheet_idx, current_placed, current_free_rects)
            sheets.append(sheet_res)

        # 4. Формируем общую сводку
        total_parts = sum(len(s.placed_parts) for s in sheets)
        total_reusable = sum(s.reusable_offcuts_count for s in sheets)
        total_used_area = sum(s.used_area for s in sheets)
        total_sheet_area = sum(s.total_area for s in sheets)

        avg_yield = round((total_used_area / total_sheet_area) * 100.0, 2) if total_sheet_area > 0 else 0.0
        avg_waste = round(100.0 - avg_yield, 2) if total_sheet_area > 0 else 0.0

        return OptimizationResult(
            total_sheets_used=len(sheets),
            sheets=sheets,
            unplaced_parts=unplaced,
            summary_yield_pct=avg_yield,
            summary_waste_pct=avg_waste,
            total_parts_placed=total_parts,
            total_reusable_offcuts=total_reusable,
            material_name=self.sheet_spec.material_name
        )

    def _find_best_fit(
        self, part: PartSpec, free_rects: List[FreeRect]
    ) -> Tuple[Optional[PlacedPart], int, bool]:
        """
        Ищет оптимальный свободный прямоугольник по критерию Best Area Fit (минимальный остаток площади).
        Возвращает (PlacedPart, индекс_свободного_rect, был_ли_поворот).
        """
        best_rect_idx = -1
        best_leftover_area = float("inf")
        best_placed: Optional[PlacedPart] = None
        best_rotated = False

        for idx, rect in enumerate(free_rects):
            # Вариант 1: без поворота (оригинальные размеры)
            if part.width <= rect.width and part.height <= rect.height:
                leftover = rect.area - part.area
                if leftover < best_leftover_area:
                    best_leftover_area = leftover
                    best_rect_idx = idx
                    best_rotated = False
                    best_placed = PlacedPart(
                        part_id=part.part_id,
                        name=part.name,
                        x=rect.x,
                        y=rect.y,
                        width=part.width,
                        height=part.height,
                        rotated=False,
                        edge_banding=part.edge_banding
                    )

            # Вариант 2: с поворотом на 90° (если разрешено can_rotate)
            if part.can_rotate and part.height <= rect.width and part.width <= rect.height:
                leftover = rect.area - part.area
                if leftover < best_leftover_area:
                    best_leftover_area = leftover
                    best_rect_idx = idx
                    best_rotated = True
                    best_placed = PlacedPart(
                        part_id=part.part_id,
                        name=part.name + " ↻",
                        x=rect.x,
                        y=rect.y,
                        width=part.height,    # Повернуто!
                        height=part.width,    # Повернуто!
                        rotated=True,
                        edge_banding=part.edge_banding
                    )

        return best_placed, best_rect_idx, best_rotated

    def _split_guillotine(
        self, rect: FreeRect, placed_w: float, placed_h: float, kerf: float
    ) -> List[FreeRect]:
        """
        Выполняет гильотиновый разрез оставшейся свободной области после размещения детали.
        Учитывает толщину пропила (kerf). Использует эвристику Shorter Leftover Axis (MINAS/MAXAS)
        для максимизации крупности остаточных прямоугольников.
        """
        # Свободная ширина и высота справа и снизу от детали (с учетом толщины пропила)
        right_w = rect.width - placed_w - kerf
        bottom_h = rect.height - placed_h - kerf

        new_rects: List[FreeRect] = []

        # Решаем, как провести сквозной гильотиновый рез: горизонтально или вертикально.
        # Стремимся сохранить максимальный цельный кусок материала.
        split_horizontal = right_w < bottom_h

        if split_horizontal:
            # Горизонтальный рез: правый прямоугольник имеет высоту placed_h, нижний занимает всю ширину rect.width
            if right_w > 0 and placed_h > 0:
                new_rects.append(FreeRect(
                    x=rect.x + placed_w + kerf,
                    y=rect.y,
                    width=right_w,
                    height=placed_h
                ))
            if bottom_h > 0 and rect.width > 0:
                new_rects.append(FreeRect(
                    x=rect.x,
                    y=rect.y + placed_h + kerf,
                    width=rect.width,
                    height=bottom_h
                ))
        else:
            # Вертикальный рез: правый прямоугольник занимает всю высоту rect.height, нижний имеет ширину placed_w
            if right_w > 0 and rect.height > 0:
                new_rects.append(FreeRect(
                    x=rect.x + placed_w + kerf,
                    y=rect.y,
                    width=right_w,
                    height=rect.height
                ))
            if bottom_h > 0 and placed_w > 0:
                new_rects.append(FreeRect(
                    x=rect.x,
                    y=rect.y + placed_h + kerf,
                    width=placed_w,
                    height=bottom_h
                ))

        return new_rects

    def _finalize_sheet(
        self, idx: int, placed: List[PlacedPart], free_rects: List[FreeRect]
    ) -> SheetResult:
        """Превращает оставшиеся FreeRect в обрезки (Offcuts) и вычисляет статистику листа."""
        offcuts = [
            Offcut(
                x=r.x,
                y=r.y,
                width=round(r.width, 1),
                height=round(r.height, 1),
                is_reusable=False
            )
            for r in free_rects if r.width >= 20.0 and r.height >= 20.0
        ]

        res = SheetResult(
            sheet_index=idx,
            sheet_spec=copy.deepcopy(self.sheet_spec),
            placed_parts=copy.deepcopy(placed),
            offcuts=offcuts
        )
        res.calculate_metrics(min_reusable_side=self.min_reusable_side)
        return res


# =====================================================================
# ВСТРОЕННЫЙ ДЕМО-ТЕСТ (СИМУЛЯЦИЯ РАСКРОЯ ШКАФА-КУПЕ КАК В SKETCHCUT PRO)
# =====================================================================
if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("=" * 75)
    print("🪚 СФЕРУМ — ДЕМОНСТРАЦИЯ РАСКРОЯ МЕБЕЛИ (Модуль 4.2: Raskroy Engine)")
    print("   Вдохновлено профессиональными стандартами SketchCut Pro")
    print("=" * 75)

    # 1. Задаем стандартный лист ЛДСП Egger 2800х2070х16 мм
    sheet = SheetSpec(
        width=2800.0,
        height=2070.0,
        thickness=16.0,
        kerf=4.0,           # Толщина пропила 4 мм
        trim_top=10.0,      # Опиловка кромки по 10 мм по периметру
        trim_bottom=10.0,
        trim_left=10.0,
        trim_right=10.0,
        material_name="ЛДСП 16мм Белый влагостойкий (Egger W1000)"
    )

    # 2. Деталировка для трехстворчатого шкафа-купе
    parts = [
        PartSpec("P01", "Боковина шкафа левая/правая", width=2400.0, height=600.0, count=2, can_rotate=False, edge_banding="2/0/2/0"),
        PartSpec("P02", "Крышка шкафа Верх/Низ", width=1800.0, height=600.0, count=2, can_rotate=False, edge_banding="2/2/0/0"),
        PartSpec("P03", "Перегородка вертикальная", width=2300.0, height=550.0, count=1, can_rotate=False, edge_banding="2/0/0/0"),
        PartSpec("P04", "Полка съемная большая", width=870.0, height=550.0, count=4, can_rotate=True, edge_banding="2/0/0/0"),
        PartSpec("P05", "Полка съемная малая", width=420.0, height=550.0, count=6, can_rotate=True, edge_banding="2/0/0/0"),
        PartSpec("P06", "Фасад ящика выдвижного", width=860.0, height=200.0, count=4, can_rotate=True, edge_banding="2/2/2/2"),
        PartSpec("P07", "Цокольная планка", width=1800.0, height=100.0, count=2, can_rotate=True, edge_banding="0/0/0/0")
    ]

    # 3. Запускаем оптимизатор
    optimizer = RaskroyOptimizer(sheet_spec=sheet, min_reusable_side=400.0)
    result = optimizer.optimize(parts)

    # 4. Выводим красивый отчет
    print(f"\n📁 МАТЕРИАЛ: {result.material_name}")
    print(f"📦 ВСЕГО ПОТРЕБОВАЛОСЬ ЛИСТОВ: {result.total_sheets_used} шт.")
    print(f"🎯 СРЕДНИЙ ПОЛЕЗНЫЙ ВЫХОД (Yield): {result.summary_yield_pct}%")
    print(f"🗑️ СРЕДНИЙ ПРОЦЕНТ ОТХОДОВ (Waste): {result.summary_waste_pct}%")
    print(f"♻️ НАЙДЕНО ДЕЛОВЫХ ОСТАТКОВ (для будущих заказов): {result.total_reusable_offcuts} шт.")

    if result.unplaced_parts:
        print(f"\n⚠️ ВНИМАНИЕ! НЕ ПОМЕСТИЛИСЬ ДЕТАЛИ (превышают габариты): {len(result.unplaced_parts)}")
        for up in result.unplaced_parts:
            print(f"   - {up.name} ({up.width}x{up.height} мм)")

    print("\n" + "-" * 75)
    print("📋 ДЕТАЛЬНАЯ КАРТА РАСКРОЯ ПО ЛИСТАМ:")
    print("-" * 75)

    for s in result.sheets:
        print(f"\n🟢 ЛИСТ #{s.sheet_index} | Полезный выход: {s.yield_percentage}% | Отходы: {s.waste_percentage}% | Длина резов: {s.total_cut_length} мм")
        print("   --- Размещенные детали ---")
        for p in s.placed_parts:
            rot_str = "[ПОВЕРНУТА 90°]" if p.rotated else ""
            print(f"   ✓ [X:{p.x:6.1f}, Y:{p.y:6.1f}] -> {p.width:5.1f} x {p.height:5.1f} мм | {p.name:28s} {rot_str}")
        
        reusable_offs = [o for o in s.offcuts if o.is_reusable]
        if reusable_offs:
            print("   --- ♻️ Деловые остатки (сохранить на склад) ---")
            for ro in reusable_offs:
                print(f"   ★ [X:{ro.x:6.1f}, Y:{ro.y:6.1f}] -> {ro.width:5.1f} x {ro.height:5.1f} мм (S = {round(ro.area/1e6, 2)} м²)")

    print("\n=" * 75)
    print("✅ ТЕСТ РАСКРОЯ УСПЕШНО ЗАВЕРШЕН!")
    print("=" * 75)
