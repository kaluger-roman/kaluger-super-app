# 039 — Полноэкранный режим в звонке: макеты

Маршрут макета (временный, без логина): `/__mockup/call-fullscreen`.
Параметры: `mode=normal|full`, `controls=1|0`, `share=1|0`, `camera=1|0`, `mic=1|0`,
`connecting=0|1`, `zoom=<масштаб>`, `panX`/`panY` (сдвиг в % от размера видео).

| Файл | Что показано |
|------|--------------|
| `screenshots/01-normal-share-desktop.png` | Обычный вид, собеседник показывает экран: кнопка «Во весь экран» в правом верхнем углу плитки (1440×900) |
| `screenshots/01-normal-share-mobile.png` | То же на телефоне 375×812 |
| `screenshots/02-normal-camera-desktop.png` | Обычный вид, камера собеседника: та же кнопка в углу плитки (1440×900) |
| `screenshots/02-normal-camera-mobile.png` | То же на телефоне 375×812 |
| `screenshots/03-full-share-controls-desktop.png` | Во весь экран, демонстрация, панели видны: сверху имя, таймер, метка демонстрации и «Свернуть»; снизу кнопки звонка и группа масштаба справа |
| `screenshots/03-full-share-controls-mobile.png` | То же на телефоне: группа масштаба отдельной строкой над кнопками звонка |
| `screenshots/03-full-share-controls-landscape.png` | То же на телефоне в альбомной ориентации 812×375: демонстрация на всю высоту, масштаб справа от кнопок |
| `screenshots/04-full-share-hidden-desktop.png` | Во весь экран, панели скрыты после 3 с бездействия: только демонстрация от края до края |
| `screenshots/04-full-share-hidden-mobile.png` | То же на телефоне 375×812 |
| `screenshots/05-full-share-zoom2-desktop.png` | Демонстрация увеличена в 2× и сдвинута к левому верхнему углу; видна кнопка «Исходный размер» |
| `screenshots/05-full-share-zoom2-mobile.png` | То же на телефоне: группа «− 200% + Исходный размер» над кнопками звонка |
| `screenshots/05-full-share-zoom4-hidden-mobile.png` | Телефон, 4×, панели скрыты: строка шрифтом 14 px на демонстрации читается |
| `screenshots/06-full-camera-micoff-desktop.png` | Во весь экран, только камера собеседника (без группы масштаба), микрофон собеседника выключен — значок рядом с именем |
| `screenshots/06-full-camera-mobile.png` | Во весь экран, камера собеседника на телефоне |
| `screenshots/07-full-connecting-desktop.png` | Во весь экран с баннером «Соединение…» по центру под верхней панелью |
