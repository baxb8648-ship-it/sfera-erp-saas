import sys
import os

notifications_path = 'backend/app/notifications.py'
with open(notifications_path, 'a', encoding='utf-8') as f:
    f.write('''\n\n
def send_booking_notification(appointment, db, action="new"):
    from .models import User, BookingService
    service = db.query(BookingService).filter(BookingService.id == appointment.service_id).first()
    master = db.query(User).filter(User.id == appointment.master_id).first()
    
    service_name = service.name if service else "Услуга"
    master_name = master.username if master else "Не назначен"
    
    if action == "new":
        text = (
            f"📅 <b>Новая запись!</b>\\n\\n"
            f"👤 <b>Клиент:</b> {appointment.client_name} ({appointment.client_phone or 'Не указан'})\\n"
            f"🛠 <b>Услуга:</b> {service_name}\\n"
            f"🕒 <b>Время:</b> {appointment.datetime_start.strftime('%d.%m.%Y %H:%M')}\\n"
            f"👨‍🔧 <b>Мастер:</b> {master_name}"
        )
    elif action == "completed":
        text = (
            f"✅ <b>Запись завершена!</b>\\n\\n"
            f"👤 <b>Клиент:</b> {appointment.client_name}\\n"
            f"🛠 <b>Услуга:</b> {service_name}\\n"
            f"👨‍🔧 <b>Мастер:</b> {master_name}\\n"
            f"📦 <i>ТМЦ списаны со склада согласно техкарте.</i>"
        )
    else:
        text = f"ℹ️ <b>Изменение записи ({action})</b>\\nКлиент: {appointment.client_name}\\nУслуга: {service_name}"
        
    if master:
        send_personal_telegram_notification(master.id, text, db, fallback_to_general=False)
        
    send_telegram_notification(text, db)
''')

main_path = 'backend/app/main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

if 'booking_route' not in main_content:
    main_content = main_content.replace(
        'furniture_route',
        'furniture_route,\n    booking_route'
    )
    main_content = main_content.replace(
        'app.include_router(furniture_route.router)',
        'app.include_router(furniture_route.router)\napp.include_router(booking_route.router)'
    )
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_content)
print('Modifications complete.')
