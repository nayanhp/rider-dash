# Rider Dash balance

Headless check of all 200 generated levels. A deterministic bot (`src/sim/bot.ts`) rides each one on seeds 1, 2, 3, 4, 5, 6, 7, 8, 9, 10. It looks about a second ahead, changes lane once per decision, jumps potholes and speed breakers, and picks up parcels when that lane is clear. Commands wait 8 ticks, so it is not perfect. It does not revive. A level counts as cleared only on a win. Runs are capped at 150 seconds.

Overall clear rate across seeds: **91%**. Level 1 is 100%. The last area is 50%.

The difficulty number is `cityIndex * cityStep + areaFraction * areaSpan`, capped at 1. `cityStep` is 0.057143 and `areaSpan` is 0.6, so the cap lands on the last area of Ahmedabad. It used to be 0.08, which pinned Lake Town through New Town in Kolkata, and Shahibaug through Manek Chowk in Ahmedabad, to the same maximum speed, goal, and density.

## By city

| City | Areas | Clear rate | Avg hits | Speed | Goal | Density |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Bengaluru | 25 | 99% | 0.18 | 260 → 356 | 2 → 7 | 0.15 → 0.42 |
| Mumbai | 25 | 97% | 0.35 | 269 → 365 | 2 → 7 | 0.18 → 0.45 |
| Delhi | 25 | 94% | 0.48 | 278 → 374 | 3 → 8 | 0.20 → 0.47 |
| Hyderabad | 25 | 93% | 0.46 | 287 → 383 | 3 → 8 | 0.23 → 0.50 |
| Chennai | 25 | 90% | 0.62 | 297 → 393 | 4 → 9 | 0.25 → 0.52 |
| Pune | 25 | 86% | 0.79 | 306 → 402 | 4 → 9 | 0.28 → 0.55 |
| Kolkata | 25 | 87% | 0.95 | 315 → 411 | 5 → 10 | 0.30 → 0.57 |
| Ahmedabad | 25 | 77% | 1.10 | 324 → 420 | 5 → 10 | 0.33 → 0.60 |

Clear rate is how often the bot won. Hits include crashes on runs it lost. Hearts and seconds are averaged over wins only. A new city starts easier than the one before it ended; that drop is the curve, not a spike.

## Outliers

- No tuning plateau. No three areas in a row share speed, goal, and density.
- No hard spike. No area inside a city clears at least 60 points below both neighbours.

## Levels

| # | City | Area | Speed | Goal | Density | Weather | Clear | Hits | Hearts | Seconds |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Bengaluru | Koramangala | 260 | 2 | 0.15 | — | 100% | 0.00 | 3.0 | 42 |
| 2 | Bengaluru | Indiranagar | 264 | 2 | 0.16 | — | 100% | 0.00 | 3.0 | 41 |
| 3 | Bengaluru | HSR Layout | 268 | 2 | 0.17 | — | 100% | 0.00 | 3.0 | 40 |
| 4 | Bengaluru | Jayanagar | 272 | 3 | 0.18 | — | 100% | 0.00 | 3.0 | 47 |
| 5 | Bengaluru | BTM Layout | 276 | 3 | 0.19 | — | 100% | 0.00 | 3.0 | 47 |
| 6 | Bengaluru | Malleshwaram | 280 | 3 | 0.21 | — | 100% | 0.00 | 3.0 | 46 |
| 7 | Bengaluru | Basavanagudi | 284 | 3 | 0.22 | — | 100% | 0.00 | 3.0 | 45 |
| 8 | Bengaluru | JP Nagar | 288 | 3 | 0.23 | — | 100% | 0.20 | 2.8 | 46 |
| 9 | Bengaluru | MG Road | 292 | 4 | 0.24 | — | 100% | 0.00 | 3.0 | 51 |
| 10 | Bengaluru | Ulsoor | 296 | 4 | 0.25 | rain | 100% | 0.00 | 3.0 | 52 |
| 11 | Bengaluru | Frazer Town | 300 | 4 | 0.26 | — | 100% | 0.00 | 3.0 | 50 |
| 12 | Bengaluru | Rajajinagar | 304 | 4 | 0.27 | — | 100% | 0.00 | 3.0 | 50 |
| 13 | Bengaluru | Banashankari | 308 | 4 | 0.28 | — | 100% | 0.00 | 3.0 | 51 |
| 14 | Bengaluru | Vijayanagar | 312 | 5 | 0.30 | night | 100% | 0.10 | 2.9 | 54 |
| 15 | Bengaluru | Bellandur | 316 | 5 | 0.31 | rain | 100% | 0.10 | 2.9 | 56 |
| 16 | Bengaluru | Sarjapur Road | 320 | 5 | 0.32 | — | 100% | 0.10 | 2.9 | 57 |
| 17 | Bengaluru | Marathahalli | 324 | 5 | 0.33 | — | 100% | 0.30 | 2.7 | 58 |
| 18 | Bengaluru | Whitefield | 328 | 5 | 0.34 | — | 100% | 0.00 | 3.0 | 52 |
| 19 | Bengaluru | Bannerghatta Road | 332 | 6 | 0.35 | — | 100% | 0.30 | 2.7 | 65 |
| 20 | Bengaluru | Electronic City | 336 | 6 | 0.36 | rain | 100% | 0.10 | 3.0 | 60 |
| 21 | Bengaluru | Hebbal | 340 | 6 | 0.38 | night | 100% | 0.40 | 2.6 | 60 |
| 22 | Bengaluru | RT Nagar | 344 | 6 | 0.39 | — | 90% | 1.10 | 2.2 | 64 |
| 23 | Bengaluru | Hennur | 348 | 6 | 0.40 | — | 90% | 0.90 | 2.4 | 61 |
| 24 | Bengaluru | Yelahanka | 352 | 7 | 0.41 | — | 100% | 0.70 | 2.4 | 67 |
| 25 | Bengaluru | Sadashivanagar | 356 | 7 | 0.42 | rain, night | 100% | 0.30 | 2.7 | 61 |
| 26 | Mumbai | Bandra | 269 | 2 | 0.18 | — | 100% | 0.00 | 3.0 | 41 |
| 27 | Mumbai | Khar | 273 | 3 | 0.19 | — | 100% | 0.00 | 3.0 | 49 |
| 28 | Mumbai | Santacruz | 277 | 3 | 0.20 | — | 100% | 0.10 | 2.9 | 48 |
| 29 | Mumbai | Juhu | 281 | 3 | 0.21 | — | 100% | 0.20 | 2.8 | 47 |
| 30 | Mumbai | Vile Parle | 285 | 3 | 0.22 | — | 100% | 0.10 | 2.9 | 46 |
| 31 | Mumbai | Andheri | 289 | 3 | 0.23 | rain | 100% | 0.00 | 3.0 | 46 |
| 32 | Mumbai | Versova | 293 | 4 | 0.24 | night | 100% | 0.20 | 2.8 | 54 |
| 33 | Mumbai | Goregaon | 297 | 4 | 0.25 | — | 100% | 0.10 | 2.9 | 54 |
| 34 | Mumbai | Malad | 301 | 4 | 0.27 | rain | 100% | 0.00 | 3.0 | 52 |
| 35 | Mumbai | Kandivali | 305 | 4 | 0.28 | — | 100% | 0.10 | 2.9 | 52 |
| 36 | Mumbai | Borivali | 309 | 4 | 0.29 | — | 100% | 0.20 | 2.8 | 53 |
| 37 | Mumbai | Powai | 313 | 5 | 0.30 | rain | 100% | 0.10 | 2.9 | 56 |
| 38 | Mumbai | Ghatkopar | 317 | 5 | 0.31 | — | 100% | 0.20 | 2.8 | 57 |
| 39 | Mumbai | Kurla | 321 | 5 | 0.32 | night | 100% | 0.30 | 2.7 | 57 |
| 40 | Mumbai | Chembur | 325 | 5 | 0.33 | rain | 100% | 0.40 | 2.6 | 55 |
| 41 | Mumbai | Sion | 329 | 5 | 0.34 | — | 100% | 0.10 | 2.9 | 54 |
| 42 | Mumbai | Wadala | 333 | 6 | 0.36 | — | 90% | 0.40 | 2.9 | 61 |
| 43 | Mumbai | Matunga | 337 | 6 | 0.37 | rain | 90% | 0.70 | 2.6 | 60 |
| 44 | Mumbai | Dadar | 341 | 6 | 0.38 | — | 100% | 0.40 | 2.6 | 61 |
| 45 | Mumbai | Worli | 345 | 6 | 0.39 | — | 90% | 0.80 | 2.4 | 62 |
| 46 | Mumbai | Lower Parel | 349 | 6 | 0.40 | rain, night | 100% | 0.60 | 2.4 | 60 |
| 47 | Mumbai | Byculla | 353 | 7 | 0.41 | — | 100% | 0.70 | 2.3 | 62 |
| 48 | Mumbai | Marine Lines | 357 | 7 | 0.42 | — | 90% | 0.80 | 2.4 | 61 |
| 49 | Mumbai | Mulund | 361 | 7 | 0.43 | rain | 70% | 1.30 | 2.4 | 62 |
| 50 | Mumbai | Colaba | 365 | 7 | 0.45 | night | 90% | 0.90 | 2.4 | 62 |
| 51 | Delhi | Connaught Place | 278 | 3 | 0.20 | — | 100% | 0.20 | 2.8 | 48 |
| 52 | Delhi | Karol Bagh | 282 | 3 | 0.21 | — | 100% | 0.20 | 2.8 | 47 |
| 53 | Delhi | Paharganj | 286 | 3 | 0.22 | — | 100% | 0.10 | 2.9 | 47 |
| 54 | Delhi | Rajouri Garden | 290 | 4 | 0.24 | — | 100% | 0.10 | 2.9 | 53 |
| 55 | Delhi | Janakpuri | 294 | 4 | 0.25 | rain | 100% | 0.00 | 3.0 | 53 |
| 56 | Delhi | Dwarka | 298 | 4 | 0.26 | — | 100% | 0.20 | 2.8 | 54 |
| 57 | Delhi | Lajpat Nagar | 302 | 4 | 0.27 | night | 100% | 0.10 | 2.9 | 53 |
| 58 | Delhi | Defence Colony | 306 | 4 | 0.28 | — | 100% | 0.10 | 2.9 | 52 |
| 59 | Delhi | Green Park | 310 | 5 | 0.29 | — | 100% | 0.20 | 2.8 | 58 |
| 60 | Delhi | Hauz Khas | 314 | 5 | 0.30 | rain | 100% | 0.20 | 2.8 | 56 |
| 61 | Delhi | Malviya Nagar | 318 | 5 | 0.31 | — | 100% | 0.30 | 2.7 | 56 |
| 62 | Delhi | Saket | 322 | 5 | 0.33 | — | 100% | 0.20 | 2.8 | 57 |
| 63 | Delhi | Sarojini Nagar | 326 | 5 | 0.34 | — | 90% | 0.50 | 2.8 | 55 |
| 64 | Delhi | Vasant Kunj | 330 | 6 | 0.35 | night | 90% | 0.40 | 2.9 | 61 |
| 65 | Delhi | Greater Kailash | 334 | 6 | 0.36 | rain | 100% | 0.60 | 2.4 | 61 |
| 66 | Delhi | Kalkaji | 338 | 6 | 0.37 | — | 90% | 0.40 | 2.9 | 61 |
| 67 | Delhi | Nehru Place | 342 | 6 | 0.38 | — | 90% | 0.60 | 2.7 | 61 |
| 68 | Delhi | Mayur Vihar | 346 | 6 | 0.39 | — | 100% | 0.20 | 2.8 | 55 |
| 69 | Delhi | Laxmi Nagar | 350 | 7 | 0.40 | — | 100% | 0.70 | 2.3 | 63 |
| 70 | Delhi | Shahdara | 354 | 7 | 0.42 | rain | 70% | 1.30 | 2.4 | 64 |
| 71 | Delhi | Model Town | 358 | 7 | 0.43 | night | 80% | 1.00 | 2.5 | 67 |
| 72 | Delhi | Pitampura | 362 | 7 | 0.44 | — | 80% | 1.00 | 2.5 | 66 |
| 73 | Delhi | Rohini | 366 | 7 | 0.45 | — | 70% | 1.30 | 2.4 | 65 |
| 74 | Delhi | Chanakyapuri | 370 | 8 | 0.46 | — | 90% | 1.10 | 2.1 | 73 |
| 75 | Delhi | Chandni Chowk | 374 | 8 | 0.47 | rain, night | 100% | 1.00 | 2.0 | 71 |
| 76 | Hyderabad | Ameerpet | 287 | 3 | 0.23 | — | 100% | 0.10 | 2.9 | 47 |
| 77 | Hyderabad | Begumpet | 291 | 4 | 0.24 | — | 100% | 0.10 | 2.9 | 53 |
| 78 | Hyderabad | Somajiguda | 295 | 4 | 0.25 | — | 100% | 0.00 | 3.0 | 62 |
| 79 | Hyderabad | Banjara Hills | 299 | 4 | 0.26 | — | 100% | 0.10 | 2.9 | 55 |
| 80 | Hyderabad | Jubilee Hills | 303 | 4 | 0.27 | rain | 100% | 0.20 | 2.8 | 54 |
| 81 | Hyderabad | Madhapur | 307 | 4 | 0.28 | — | 100% | 0.10 | 2.9 | 52 |
| 82 | Hyderabad | HITEC City | 311 | 5 | 0.29 | night | 100% | 0.00 | 3.0 | 56 |
| 83 | Hyderabad | Gachibowli | 315 | 5 | 0.31 | — | 100% | 0.00 | 3.0 | 56 |
| 84 | Hyderabad | Kondapur | 319 | 5 | 0.32 | — | 100% | 0.00 | 3.0 | 55 |
| 85 | Hyderabad | Manikonda | 323 | 5 | 0.33 | rain | 100% | 0.10 | 2.9 | 57 |
| 86 | Hyderabad | Tolichowki | 327 | 5 | 0.34 | — | 100% | 0.10 | 2.9 | 57 |
| 87 | Hyderabad | Mehdipatnam | 331 | 6 | 0.35 | — | 100% | 0.10 | 2.9 | 64 |
| 88 | Hyderabad | Kukatpally | 335 | 6 | 0.36 | — | 100% | 0.10 | 2.9 | 63 |
| 89 | Hyderabad | Miyapur | 339 | 6 | 0.37 | night | 100% | 0.10 | 2.9 | 66 |
| 90 | Hyderabad | Kompally | 343 | 6 | 0.38 | rain | 100% | 0.20 | 2.8 | 63 |
| 91 | Hyderabad | Secunderabad | 347 | 6 | 0.40 | — | 80% | 1.00 | 2.5 | 65 |
| 92 | Hyderabad | Tarnaka | 351 | 7 | 0.41 | — | 80% | 1.10 | 2.4 | 72 |
| 93 | Hyderabad | Uppal | 355 | 7 | 0.42 | — | 70% | 1.10 | 2.7 | 73 |
| 94 | Hyderabad | Himayatnagar | 359 | 7 | 0.43 | — | 70% | 1.30 | 2.6 | 79 |
| 95 | Hyderabad | Abids | 363 | 7 | 0.44 | rain | 90% | 1.10 | 2.1 | 73 |
| 96 | Hyderabad | Nampally | 367 | 7 | 0.45 | night | 100% | 0.70 | 2.5 | 75 |
| 97 | Hyderabad | Malakpet | 371 | 8 | 0.46 | — | 90% | 0.80 | 2.4 | 77 |
| 98 | Hyderabad | Dilsukhnagar | 375 | 8 | 0.47 | — | 80% | 1.10 | 2.4 | 76 |
| 99 | Hyderabad | LB Nagar | 379 | 8 | 0.49 | — | 80% | 1.10 | 2.4 | 73 |
| 100 | Hyderabad | Charminar | 383 | 8 | 0.50 | rain, night | 90% | 0.90 | 2.3 | 70 |
| 101 | Chennai | T. Nagar | 297 | 4 | 0.25 | — | 100% | 0.20 | 2.8 | 57 |
| 102 | Chennai | Mylapore | 301 | 4 | 0.26 | — | 100% | 0.50 | 2.5 | 59 |
| 103 | Chennai | Alwarpet | 305 | 4 | 0.28 | — | 100% | 0.00 | 3.0 | 53 |
| 104 | Chennai | Nungambakkam | 309 | 4 | 0.29 | — | 100% | 0.00 | 3.0 | 50 |
| 105 | Chennai | Egmore | 313 | 5 | 0.30 | rain | 100% | 0.10 | 2.9 | 59 |
| 106 | Chennai | Kilpauk | 317 | 5 | 0.31 | — | 100% | 0.20 | 2.8 | 61 |
| 107 | Chennai | Anna Nagar | 321 | 5 | 0.32 | night | 90% | 0.40 | 3.0 | 59 |
| 108 | Chennai | Ashok Nagar | 325 | 5 | 0.33 | — | 90% | 0.50 | 2.8 | 60 |
| 109 | Chennai | KK Nagar | 329 | 5 | 0.34 | — | 90% | 0.50 | 2.8 | 56 |
| 110 | Chennai | Vadapalani | 333 | 6 | 0.35 | rain | 100% | 0.40 | 2.6 | 66 |
| 111 | Chennai | Kodambakkam | 337 | 6 | 0.37 | — | 80% | 0.90 | 2.6 | 66 |
| 112 | Chennai | Saidapet | 341 | 6 | 0.38 | — | 90% | 0.80 | 2.7 | 69 |
| 113 | Chennai | Guindy | 345 | 6 | 0.39 | — | 90% | 0.50 | 2.8 | 64 |
| 114 | Chennai | Velachery | 349 | 6 | 0.40 | night | 90% | 0.40 | 2.9 | 63 |
| 115 | Chennai | Adyar | 353 | 7 | 0.41 | rain | 100% | 0.50 | 2.5 | 65 |
| 116 | Chennai | Besant Nagar | 357 | 7 | 0.42 | — | 90% | 0.40 | 2.9 | 66 |
| 117 | Chennai | Thiruvanmiyur | 361 | 7 | 0.43 | — | 70% | 1.00 | 2.9 | 68 |
| 118 | Chennai | Perungudi | 365 | 7 | 0.44 | — | 100% | 0.30 | 2.7 | 66 |
| 119 | Chennai | Sholinganallur | 369 | 7 | 0.46 | — | 90% | 0.70 | 2.6 | 65 |
| 120 | Chennai | Porur | 373 | 8 | 0.47 | rain | 80% | 0.90 | 2.6 | 73 |
| 121 | Chennai | Chromepet | 377 | 8 | 0.48 | night | 90% | 1.40 | 1.8 | 76 |
| 122 | Chennai | Tambaram | 381 | 8 | 0.49 | — | 80% | 1.30 | 2.1 | 69 |
| 123 | Chennai | Perambur | 385 | 8 | 0.50 | — | 90% | 1.00 | 2.2 | 69 |
| 124 | Chennai | Royapettah | 389 | 8 | 0.51 | — | 90% | 0.90 | 2.3 | 69 |
| 125 | Chennai | Triplicane | 393 | 9 | 0.52 | rain, night | 60% | 1.60 | 2.3 | 76 |
| 126 | Pune | Shivajinagar | 306 | 4 | 0.28 | — | 100% | 0.00 | 3.0 | 53 |
| 127 | Pune | Deccan | 310 | 4 | 0.29 | — | 100% | 0.00 | 3.0 | 51 |
| 128 | Pune | Sadashiv Peth | 314 | 5 | 0.30 | — | 100% | 0.30 | 2.7 | 63 |
| 129 | Pune | Erandwane | 318 | 5 | 0.31 | — | 90% | 0.50 | 2.8 | 63 |
| 130 | Pune | Kothrud | 322 | 5 | 0.32 | rain | 90% | 0.50 | 2.9 | 62 |
| 131 | Pune | Karve Nagar | 326 | 5 | 0.33 | — | 90% | 0.40 | 3.0 | 60 |
| 132 | Pune | Camp | 330 | 5 | 0.35 | night | 80% | 0.70 | 2.9 | 58 |
| 133 | Pune | Koregaon Park | 334 | 6 | 0.36 | — | 80% | 0.90 | 2.6 | 67 |
| 134 | Pune | Kalyani Nagar | 338 | 6 | 0.37 | — | 80% | 1.20 | 2.4 | 70 |
| 135 | Pune | Viman Nagar | 342 | 6 | 0.38 | rain | 100% | 0.60 | 2.4 | 67 |
| 136 | Pune | Yerawada | 346 | 6 | 0.39 | — | 100% | 0.00 | 3.0 | 59 |
| 137 | Pune | Kharadi | 350 | 6 | 0.40 | — | 90% | 0.30 | 3.0 | 61 |
| 138 | Pune | Hadapsar | 354 | 7 | 0.41 | — | 90% | 0.60 | 2.7 | 70 |
| 139 | Pune | Magarpatta | 358 | 7 | 0.42 | night | 80% | 0.70 | 2.9 | 68 |
| 140 | Pune | Wanowrie | 362 | 7 | 0.44 | rain | 100% | 0.40 | 2.6 | 67 |
| 141 | Pune | Kondhwa | 366 | 7 | 0.45 | — | 80% | 1.10 | 2.4 | 67 |
| 142 | Pune | Swargate | 370 | 7 | 0.46 | — | 80% | 1.20 | 2.3 | 68 |
| 143 | Pune | Sinhagad Road | 374 | 8 | 0.47 | — | 80% | 1.10 | 2.4 | 72 |
| 144 | Pune | Aundh | 378 | 8 | 0.48 | — | 70% | 1.80 | 1.7 | 77 |
| 145 | Pune | Baner | 382 | 8 | 0.49 | rain | 80% | 1.00 | 2.5 | 68 |
| 146 | Pune | Pashan | 386 | 8 | 0.50 | night | 100% | 0.80 | 2.2 | 71 |
| 147 | Pune | Bavdhan | 390 | 8 | 0.51 | — | 90% | 1.30 | 1.9 | 71 |
| 148 | Pune | Wakad | 394 | 9 | 0.53 | — | 60% | 1.70 | 2.2 | 76 |
| 149 | Pune | Pimple Saudagar | 398 | 9 | 0.54 | — | 60% | 1.50 | 2.5 | 79 |
| 150 | Pune | Hinjewadi | 402 | 9 | 0.55 | rain, night | 90% | 1.10 | 2.1 | 78 |
| 151 | Kolkata | Park Street | 315 | 5 | 0.30 | — | 90% | 0.40 | 2.9 | 61 |
| 152 | Kolkata | Chowringhee | 319 | 5 | 0.32 | — | 90% | 0.50 | 2.8 | 64 |
| 153 | Kolkata | Esplanade | 323 | 5 | 0.33 | — | 100% | 0.60 | 2.4 | 62 |
| 154 | Kolkata | Elgin Road | 327 | 5 | 0.34 | — | 100% | 0.30 | 2.7 | 60 |
| 155 | Kolkata | Bhowanipore | 331 | 6 | 0.35 | rain | 100% | 0.30 | 2.8 | 65 |
| 156 | Kolkata | Kalighat | 335 | 6 | 0.36 | — | 100% | 0.50 | 2.5 | 67 |
| 157 | Kolkata | Alipore | 339 | 6 | 0.37 | night | 100% | 0.50 | 2.6 | 64 |
| 158 | Kolkata | Ballygunge | 343 | 6 | 0.38 | — | 100% | 0.20 | 2.8 | 61 |
| 159 | Kolkata | Gariahat | 347 | 6 | 0.39 | — | 100% | 0.70 | 2.5 | 68 |
| 160 | Kolkata | Kasba | 351 | 7 | 0.41 | rain | 100% | 0.60 | 2.5 | 72 |
| 161 | Kolkata | Jadavpur | 355 | 7 | 0.42 | — | 100% | 0.90 | 2.3 | 76 |
| 162 | Kolkata | Tollygunge | 359 | 7 | 0.43 | — | 90% | 0.30 | 3.0 | 70 |
| 163 | Kolkata | Behala | 363 | 7 | 0.44 | — | 90% | 0.70 | 2.7 | 62 |
| 164 | Kolkata | Garia | 367 | 7 | 0.45 | night | 90% | 0.50 | 2.9 | 65 |
| 165 | Kolkata | Entally | 371 | 8 | 0.46 | rain | 100% | 1.00 | 2.1 | 71 |
| 166 | Kolkata | Sealdah | 375 | 8 | 0.47 | — | 90% | 0.60 | 2.7 | 73 |
| 167 | Kolkata | College Street | 379 | 8 | 0.48 | — | 80% | 1.30 | 2.1 | 70 |
| 168 | Kolkata | Burrabazar | 383 | 8 | 0.50 | — | 100% | 0.60 | 2.4 | 65 |
| 169 | Kolkata | Bagbazar | 387 | 8 | 0.51 | — | 70% | 1.60 | 2.0 | 74 |
| 170 | Kolkata | Shyambazar | 391 | 9 | 0.52 | rain | 60% | 1.90 | 1.8 | 70 |
| 171 | Kolkata | Dum Dum | 395 | 9 | 0.53 | night | 70% | 2.10 | 1.6 | 85 |
| 172 | Kolkata | Lake Town | 399 | 9 | 0.54 | — | 50% | 2.10 | 2.0 | 75 |
| 173 | Kolkata | Salt Lake | 403 | 9 | 0.55 | — | 80% | 1.90 | 1.6 | 77 |
| 174 | Kolkata | Rajarhat | 407 | 9 | 0.56 | — | 80% | 1.50 | 2.1 | 75 |
| 175 | Kolkata | New Town | 411 | 10 | 0.57 | rain, night | 40% | 2.20 | 2.0 | 77 |
| 176 | Ahmedabad | Navrangpura | 324 | 5 | 0.33 | — | 90% | 0.40 | 3.0 | 60 |
| 177 | Ahmedabad | CG Road | 328 | 5 | 0.34 | — | 90% | 0.60 | 2.8 | 59 |
| 178 | Ahmedabad | Law Garden | 332 | 6 | 0.35 | — | 100% | 0.20 | 2.8 | 70 |
| 179 | Ahmedabad | Ellisbridge | 336 | 6 | 0.36 | — | 90% | 0.50 | 2.8 | 65 |
| 180 | Ahmedabad | Paldi | 340 | 6 | 0.38 | rain | 90% | 0.30 | 3.0 | 61 |
| 181 | Ahmedabad | Ashram Road | 344 | 6 | 0.39 | — | 90% | 0.80 | 2.4 | 71 |
| 182 | Ahmedabad | Vastrapur | 348 | 6 | 0.40 | night | 90% | 0.70 | 2.6 | 65 |
| 183 | Ahmedabad | Bodakdev | 352 | 7 | 0.41 | — | 100% | 0.60 | 2.4 | 72 |
| 184 | Ahmedabad | Satellite | 356 | 7 | 0.42 | — | 90% | 0.50 | 2.8 | 66 |
| 185 | Ahmedabad | Prahlad Nagar | 360 | 7 | 0.43 | rain | 90% | 0.50 | 2.8 | 65 |
| 186 | Ahmedabad | SG Highway | 364 | 7 | 0.44 | — | 90% | 0.60 | 2.8 | 65 |
| 187 | Ahmedabad | Thaltej | 368 | 7 | 0.45 | — | 80% | 0.90 | 2.8 | 69 |
| 188 | Ahmedabad | Bopal | 372 | 8 | 0.47 | — | 90% | 0.90 | 2.3 | 75 |
| 189 | Ahmedabad | Vejalpur | 376 | 8 | 0.48 | night | 70% | 1.20 | 2.6 | 77 |
| 190 | Ahmedabad | Naranpura | 380 | 8 | 0.49 | rain | 50% | 1.70 | 2.6 | 72 |
| 191 | Ahmedabad | Ghatlodia | 384 | 8 | 0.50 | — | 70% | 1.80 | 1.9 | 75 |
| 192 | Ahmedabad | Gota | 388 | 8 | 0.51 | — | 70% | 1.50 | 2.1 | 74 |
| 193 | Ahmedabad | Chandkheda | 392 | 9 | 0.52 | — | 70% | 1.50 | 2.3 | 78 |
| 194 | Ahmedabad | Shahibaug | 396 | 9 | 0.53 | — | 60% | 1.50 | 2.7 | 75 |
| 195 | Ahmedabad | Kalupur | 400 | 9 | 0.54 | rain | 90% | 1.20 | 2.0 | 73 |
| 196 | Ahmedabad | Naroda | 404 | 9 | 0.56 | night | 60% | 1.80 | 2.2 | 79 |
| 197 | Ahmedabad | Nikol | 408 | 9 | 0.57 | — | 80% | 1.00 | 2.5 | 75 |
| 198 | Ahmedabad | Vastral | 412 | 10 | 0.58 | — | 40% | 2.10 | 2.3 | 82 |
| 199 | Ahmedabad | Maninagar | 416 | 10 | 0.59 | — | 40% | 2.30 | 2.0 | 84 |
| 200 | Ahmedabad | Manek Chowk | 420 | 10 | 0.60 | rain, night | 50% | 2.40 | 2.0 | 76 |
