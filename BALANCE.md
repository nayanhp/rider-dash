# Rider Dash balance

Headless check of all 200 generated levels. A deterministic bot (`src/sim/bot.ts`) rides each one on seeds 1, 2, 3, 4, 5, 6, 7, 8, 9, 10. It looks about a second ahead, changes lane once per decision, jumps potholes and speed breakers, and picks up parcels when that lane is clear. Commands wait 8 ticks, so it is not perfect. It does not revive. A level counts as cleared only on a win. Runs are capped at 150 seconds.

Overall clear rate across seeds: **46%**. Level 1 is 100%. The last area is 0%.

The difficulty number is `cityIndex * cityStep + areaFraction * areaSpan`, capped at 1. `cityStep` is 0.057143 and `areaSpan` is 0.6, so the cap lands on the last area of Ahmedabad. Parcel goals, speed, density and row gap come from the knot table in `levels.json` (a short flat shelf, a step by Bengaluru area 5, then an ease-in). It used to be a straight lerp, which left the first half of Bengaluru almost as easy as the opening.

## By city

| City | Areas | Clear rate | Avg hits | Speed | Goal | Density |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Bengaluru | 25 | 93% | 0.67 | 260 → 389 | 2 → 14 | 0.15 → 0.49 |
| Mumbai | 25 | 75% | 1.20 | 274 → 401 | 4 → 14 | 0.19 → 0.52 |
| Delhi | 25 | 59% | 1.76 | 296 → 418 | 6 → 15 | 0.24 → 0.56 |
| Hyderabad | 25 | 51% | 2.13 | 305 → 434 | 7 → 16 | 0.27 → 0.61 |
| Chennai | 25 | 38% | 2.44 | 314 → 451 | 8 → 17 | 0.29 → 0.65 |
| Pune | 25 | 20% | 2.76 | 325 → 467 | 9 → 18 | 0.32 → 0.69 |
| Kolkata | 25 | 21% | 2.76 | 336 → 484 | 10 → 19 | 0.35 → 0.74 |
| Ahmedabad | 25 | 10% | 2.96 | 346 → 500 | 11 → 20 | 0.38 → 0.78 |

Clear rate is how often the bot won. Hits include crashes on runs it lost. Hearts and seconds are averaged over wins only. A new city starts easier than the one before it ended; that drop is the curve, not a spike.

## Outliers

- No tuning plateau. No three areas in a row share speed, goal, and density.
- No hard spike. No area inside a city clears at least 60 points below both neighbours.

## Levels

| # | City | Area | Speed | Goal | Density | Weather | Clear | Hits | Hearts | Seconds |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Bengaluru | Koramangala | 260 | 2 | 0.15 | — | 100% | 0.00 | 3.0 | 42 |
| 2 | Bengaluru | Indiranagar | 260 | 2 | 0.15 | — | 100% | 0.00 | 3.0 | 42 |
| 3 | Bengaluru | HSR Layout | 271 | 3 | 0.18 | — | 100% | 0.00 | 3.0 | 47 |
| 4 | Bengaluru | Jayanagar | 282 | 5 | 0.21 | — | 100% | 0.10 | 2.9 | 60 |
| 5 | Bengaluru | BTM Layout | 294 | 6 | 0.24 | — | 100% | 0.20 | 2.8 | 68 |
| 6 | Bengaluru | Malleshwaram | 298 | 6 | 0.25 | — | 100% | 0.20 | 2.8 | 64 |
| 7 | Bengaluru | Basavanagudi | 302 | 7 | 0.26 | — | 100% | 0.30 | 2.7 | 69 |
| 8 | Bengaluru | JP Nagar | 306 | 7 | 0.27 | — | 100% | 0.30 | 2.7 | 70 |
| 9 | Bengaluru | MG Road | 310 | 8 | 0.28 | — | 100% | 0.50 | 2.5 | 74 |
| 10 | Bengaluru | Ulsoor | 314 | 8 | 0.29 | rain | 100% | 0.20 | 2.8 | 76 |
| 11 | Bengaluru | Frazer Town | 318 | 9 | 0.30 | — | 100% | 0.80 | 2.2 | 88 |
| 12 | Bengaluru | Rajajinagar | 323 | 9 | 0.32 | — | 100% | 0.70 | 2.3 | 80 |
| 13 | Bengaluru | Banashankari | 328 | 9 | 0.33 | — | 100% | 0.80 | 2.2 | 80 |
| 14 | Bengaluru | Vijayanagar | 332 | 10 | 0.34 | night | 100% | 0.40 | 2.6 | 81 |
| 15 | Bengaluru | Bellandur | 337 | 10 | 0.35 | rain | 80% | 1.00 | 2.5 | 83 |
| 16 | Bengaluru | Sarjapur Road | 342 | 10 | 0.36 | — | 90% | 0.80 | 2.4 | 83 |
| 17 | Bengaluru | Marathahalli | 346 | 11 | 0.38 | — | 90% | 1.50 | 1.7 | 94 |
| 18 | Bengaluru | Whitefield | 352 | 11 | 0.39 | — | 100% | 0.20 | 2.8 | 85 |
| 19 | Bengaluru | Bannerghatta Road | 357 | 11 | 0.40 | — | 90% | 0.60 | 2.7 | 83 |
| 20 | Bengaluru | Electronic City | 362 | 12 | 0.42 | rain | 80% | 1.60 | 2.8 | 89 |
| 21 | Bengaluru | Hebbal | 368 | 12 | 0.43 | night | 70% | 1.30 | 2.6 | 87 |
| 22 | Bengaluru | RT Nagar | 373 | 12 | 0.45 | — | 90% | 1.10 | 2.1 | 92 |
| 23 | Bengaluru | Hennur | 378 | 13 | 0.46 | — | 90% | 1.30 | 1.9 | 94 |
| 24 | Bengaluru | Yelahanka | 383 | 13 | 0.47 | — | 80% | 1.40 | 2.0 | 94 |
| 25 | Bengaluru | Sadashivanagar | 389 | 14 | 0.49 | rain, night | 60% | 1.50 | 2.8 | 87 |
| 26 | Mumbai | Bandra | 274 | 4 | 0.19 | — | 100% | 0.20 | 2.8 | 57 |
| 27 | Mumbai | Khar | 286 | 5 | 0.22 | — | 100% | 0.50 | 2.5 | 67 |
| 28 | Mumbai | Santacruz | 295 | 6 | 0.24 | — | 90% | 0.50 | 2.9 | 65 |
| 29 | Mumbai | Juhu | 299 | 7 | 0.25 | — | 100% | 0.50 | 2.5 | 76 |
| 30 | Mumbai | Vile Parle | 303 | 7 | 0.26 | — | 100% | 0.50 | 2.5 | 76 |
| 31 | Mumbai | Andheri | 307 | 7 | 0.27 | rain | 90% | 0.60 | 2.7 | 69 |
| 32 | Mumbai | Versova | 311 | 8 | 0.28 | night | 80% | 1.10 | 2.4 | 77 |
| 33 | Mumbai | Goregaon | 315 | 8 | 0.29 | — | 90% | 0.60 | 2.7 | 79 |
| 34 | Mumbai | Malad | 320 | 9 | 0.31 | rain | 90% | 0.80 | 2.4 | 86 |
| 35 | Mumbai | Kandivali | 324 | 9 | 0.32 | — | 100% | 0.30 | 2.7 | 79 |
| 36 | Mumbai | Borivali | 329 | 9 | 0.33 | — | 100% | 0.50 | 2.5 | 77 |
| 37 | Mumbai | Powai | 334 | 10 | 0.34 | rain | 100% | 0.80 | 2.2 | 85 |
| 38 | Mumbai | Ghatkopar | 338 | 10 | 0.36 | — | 100% | 0.70 | 2.4 | 89 |
| 39 | Mumbai | Kurla | 343 | 10 | 0.37 | night | 80% | 0.90 | 2.6 | 81 |
| 40 | Mumbai | Chembur | 348 | 11 | 0.38 | rain | 80% | 1.20 | 2.3 | 92 |
| 41 | Mumbai | Sion | 353 | 11 | 0.39 | — | 90% | 0.80 | 2.6 | 94 |
| 42 | Mumbai | Wadala | 358 | 11 | 0.41 | — | 70% | 1.10 | 2.9 | 86 |
| 43 | Mumbai | Matunga | 364 | 12 | 0.42 | rain | 50% | 1.90 | 2.2 | 85 |
| 44 | Mumbai | Dadar | 369 | 12 | 0.44 | — | 70% | 1.60 | 2.0 | 97 |
| 45 | Mumbai | Worli | 374 | 13 | 0.45 | — | 70% | 1.50 | 2.3 | 95 |
| 46 | Mumbai | Lower Parel | 380 | 13 | 0.46 | rain, night | 40% | 2.50 | 1.8 | 96 |
| 47 | Mumbai | Byculla | 385 | 13 | 0.48 | — | 30% | 2.60 | 2.3 | 98 |
| 48 | Mumbai | Marine Lines | 390 | 14 | 0.49 | — | 20% | 2.80 | 2.5 | 101 |
| 49 | Mumbai | Mulund | 395 | 14 | 0.51 | rain | 20% | 2.70 | 2.0 | 99 |
| 50 | Mumbai | Colaba | 401 | 14 | 0.52 | night | 20% | 2.70 | 2.0 | 103 |
| 51 | Delhi | Connaught Place | 296 | 6 | 0.24 | — | 100% | 0.30 | 2.7 | 65 |
| 52 | Delhi | Karol Bagh | 300 | 7 | 0.25 | — | 90% | 0.50 | 2.8 | 72 |
| 53 | Delhi | Paharganj | 304 | 7 | 0.27 | — | 90% | 0.60 | 2.7 | 70 |
| 54 | Delhi | Rajouri Garden | 308 | 8 | 0.28 | — | 90% | 1.00 | 2.2 | 81 |
| 55 | Delhi | Janakpuri | 312 | 8 | 0.29 | rain | 100% | 0.50 | 2.5 | 78 |
| 56 | Delhi | Dwarka | 316 | 8 | 0.30 | — | 70% | 1.50 | 2.1 | 81 |
| 57 | Delhi | Lajpat Nagar | 321 | 9 | 0.31 | night | 90% | 1.10 | 2.1 | 89 |
| 58 | Delhi | Defence Colony | 326 | 9 | 0.32 | — | 60% | 1.60 | 2.3 | 88 |
| 59 | Delhi | Green Park | 330 | 9 | 0.33 | — | 60% | 1.60 | 2.3 | 86 |
| 60 | Delhi | Hauz Khas | 335 | 10 | 0.35 | rain | 80% | 1.30 | 2.1 | 90 |
| 61 | Delhi | Malviya Nagar | 340 | 10 | 0.36 | — | 60% | 1.50 | 2.5 | 86 |
| 62 | Delhi | Saket | 344 | 10 | 0.37 | — | 60% | 1.60 | 2.3 | 84 |
| 63 | Delhi | Sarojini Nagar | 349 | 11 | 0.38 | — | 40% | 1.90 | 2.8 | 88 |
| 64 | Delhi | Vasant Kunj | 355 | 11 | 0.40 | night | 80% | 1.30 | 2.3 | 93 |
| 65 | Delhi | Greater Kailash | 360 | 12 | 0.41 | rain | 50% | 1.90 | 2.4 | 94 |
| 66 | Delhi | Kalkaji | 365 | 12 | 0.43 | — | 40% | 2.30 | 2.3 | 93 |
| 67 | Delhi | Nehru Place | 371 | 12 | 0.44 | — | 70% | 1.50 | 2.4 | 91 |
| 68 | Delhi | Mayur Vihar | 376 | 13 | 0.45 | — | 60% | 2.30 | 1.7 | 101 |
| 69 | Delhi | Laxmi Nagar | 381 | 13 | 0.47 | — | 30% | 2.60 | 2.0 | 102 |
| 70 | Delhi | Shahdara | 386 | 13 | 0.48 | rain | 20% | 2.80 | 2.0 | 103 |
| 71 | Delhi | Model Town | 392 | 14 | 0.50 | night | 30% | 2.70 | 1.7 | 106 |
| 72 | Delhi | Pitampura | 397 | 14 | 0.51 | — | 30% | 2.90 | 1.3 | 109 |
| 73 | Delhi | Rohini | 403 | 14 | 0.53 | — | 30% | 3.00 | 1.3 | 93 |
| 74 | Delhi | Chanakyapuri | 411 | 15 | 0.55 | — | 20% | 2.90 | 2.5 | 100 |
| 75 | Delhi | Chandni Chowk | 418 | 15 | 0.56 | rain, night | 30% | 2.80 | 2.0 | 101 |
| 76 | Hyderabad | Ameerpet | 305 | 7 | 0.27 | — | 80% | 1.40 | 2.1 | 73 |
| 77 | Hyderabad | Begumpet | 309 | 8 | 0.28 | — | 80% | 1.50 | 2.0 | 83 |
| 78 | Hyderabad | Somajiguda | 313 | 8 | 0.29 | — | 100% | 0.60 | 2.5 | 98 |
| 79 | Hyderabad | Banjara Hills | 318 | 8 | 0.30 | — | 90% | 1.20 | 2.0 | 82 |
| 80 | Hyderabad | Jubilee Hills | 322 | 9 | 0.31 | rain | 80% | 1.60 | 1.8 | 88 |
| 81 | Hyderabad | Madhapur | 327 | 9 | 0.33 | — | 80% | 1.10 | 2.5 | 83 |
| 82 | Hyderabad | HITEC City | 332 | 10 | 0.34 | night | 70% | 1.90 | 1.6 | 96 |
| 83 | Hyderabad | Gachibowli | 336 | 10 | 0.35 | — | 90% | 1.60 | 1.6 | 89 |
| 84 | Hyderabad | Kondapur | 341 | 10 | 0.36 | — | 70% | 1.50 | 2.1 | 87 |
| 85 | Hyderabad | Manikonda | 346 | 11 | 0.38 | rain | 70% | 1.90 | 2.1 | 98 |
| 86 | Hyderabad | Tolichowki | 351 | 11 | 0.39 | — | 30% | 2.50 | 2.0 | 89 |
| 87 | Hyderabad | Mehdipatnam | 356 | 11 | 0.40 | — | 50% | 1.90 | 2.4 | 90 |
| 88 | Hyderabad | Kukatpally | 361 | 12 | 0.42 | — | 60% | 2.20 | 2.0 | 93 |
| 89 | Hyderabad | Miyapur | 367 | 12 | 0.43 | night | 60% | 1.80 | 2.2 | 93 |
| 90 | Hyderabad | Kompally | 372 | 12 | 0.44 | rain | 50% | 2.10 | 2.2 | 91 |
| 91 | Hyderabad | Secunderabad | 377 | 13 | 0.46 | — | 40% | 2.70 | 1.3 | 102 |
| 92 | Hyderabad | Tarnaka | 383 | 13 | 0.47 | — | 20% | 2.90 | 2.0 | 102 |
| 93 | Hyderabad | Uppal | 388 | 13 | 0.49 | — | 30% | 2.60 | 2.0 | 111 |
| 94 | Hyderabad | Himayatnagar | 393 | 14 | 0.50 | — | 40% | 2.40 | 2.3 | 111 |
| 95 | Hyderabad | Abids | 398 | 14 | 0.51 | rain | 20% | 2.80 | 1.5 | 100 |
| 96 | Hyderabad | Nampally | 405 | 15 | 0.53 | night | 40% | 2.70 | 1.5 | 114 |
| 97 | Hyderabad | Malakpet | 413 | 15 | 0.55 | — | 10% | 2.80 | 2.0 | 92 |
| 98 | Hyderabad | Dilsukhnagar | 420 | 15 | 0.57 | — | 10% | 3.20 | 1.0 | 105 |
| 99 | Hyderabad | LB Nagar | 427 | 16 | 0.59 | — | 0% | 3.20 | — | — |
| 100 | Hyderabad | Charminar | 434 | 16 | 0.61 | rain, night | 0% | 3.10 | — | — |
| 101 | Chennai | T. Nagar | 314 | 8 | 0.29 | — | 70% | 1.30 | 2.4 | 77 |
| 102 | Chennai | Mylapore | 319 | 9 | 0.31 | — | 80% | 1.10 | 2.5 | 89 |
| 103 | Chennai | Alwarpet | 324 | 9 | 0.32 | — | 70% | 1.70 | 2.1 | 86 |
| 104 | Chennai | Nungambakkam | 328 | 9 | 0.33 | — | 90% | 1.40 | 2.1 | 93 |
| 105 | Chennai | Egmore | 333 | 10 | 0.34 | rain | 80% | 2.00 | 1.4 | 100 |
| 106 | Chennai | Kilpauk | 338 | 10 | 0.35 | — | 80% | 1.50 | 2.0 | 95 |
| 107 | Chennai | Anna Nagar | 342 | 10 | 0.37 | night | 80% | 1.60 | 1.9 | 96 |
| 108 | Chennai | Ashok Nagar | 347 | 11 | 0.38 | — | 50% | 1.90 | 2.2 | 92 |
| 109 | Chennai | KK Nagar | 352 | 11 | 0.39 | — | 50% | 2.30 | 2.0 | 100 |
| 110 | Chennai | Vadapalani | 358 | 11 | 0.41 | rain | 20% | 2.80 | 1.0 | 94 |
| 111 | Chennai | Kodambakkam | 363 | 12 | 0.42 | — | 50% | 2.30 | 2.0 | 111 |
| 112 | Chennai | Saidapet | 368 | 12 | 0.43 | — | 30% | 2.70 | 1.0 | 106 |
| 113 | Chennai | Guindy | 374 | 12 | 0.45 | — | 40% | 2.50 | 2.0 | 108 |
| 114 | Chennai | Velachery | 379 | 13 | 0.46 | night | 30% | 2.50 | 2.3 | 104 |
| 115 | Chennai | Adyar | 384 | 13 | 0.48 | rain | 10% | 3.10 | 1.0 | 107 |
| 116 | Chennai | Besant Nagar | 389 | 14 | 0.49 | — | 10% | 3.00 | 1.0 | 103 |
| 117 | Chennai | Thiruvanmiyur | 395 | 14 | 0.50 | — | 30% | 2.60 | 2.3 | 106 |
| 118 | Chennai | Perungudi | 400 | 14 | 0.52 | — | 30% | 3.00 | 1.0 | 107 |
| 119 | Chennai | Sholinganallur | 407 | 15 | 0.54 | — | 20% | 2.80 | 2.0 | 95 |
| 120 | Chennai | Porur | 415 | 15 | 0.56 | rain | 0% | 3.00 | — | — |
| 121 | Chennai | Chromepet | 422 | 16 | 0.57 | night | 10% | 3.10 | 1.0 | 120 |
| 122 | Chennai | Tambaram | 429 | 16 | 0.59 | — | 0% | 3.30 | — | — |
| 123 | Chennai | Perambur | 436 | 16 | 0.61 | — | 10% | 3.20 | 2.0 | 125 |
| 124 | Chennai | Royapettah | 443 | 17 | 0.63 | — | 0% | 3.20 | — | — |
| 125 | Chennai | Triplicane | 451 | 17 | 0.65 | rain, night | 0% | 3.10 | — | — |
| 126 | Pune | Shivajinagar | 325 | 9 | 0.32 | — | 70% | 1.40 | 2.6 | 88 |
| 127 | Pune | Deccan | 330 | 9 | 0.33 | — | 70% | 1.70 | 2.4 | 87 |
| 128 | Pune | Sadashiv Peth | 334 | 10 | 0.35 | — | 40% | 2.90 | 1.5 | 98 |
| 129 | Pune | Erandwane | 339 | 10 | 0.36 | — | 50% | 2.20 | 2.2 | 97 |
| 130 | Pune | Kothrud | 344 | 10 | 0.37 | rain | 50% | 2.20 | 1.6 | 95 |
| 131 | Pune | Karve Nagar | 349 | 11 | 0.38 | — | 20% | 2.80 | 1.5 | 110 |
| 132 | Pune | Camp | 354 | 11 | 0.40 | night | 50% | 2.00 | 2.0 | 106 |
| 133 | Pune | Koregaon Park | 359 | 12 | 0.41 | — | 30% | 2.30 | 2.3 | 114 |
| 134 | Pune | Kalyani Nagar | 365 | 12 | 0.42 | — | 20% | 2.70 | 1.5 | 108 |
| 135 | Pune | Viman Nagar | 370 | 12 | 0.44 | rain | 20% | 2.70 | 1.5 | 98 |
| 136 | Pune | Yerawada | 375 | 13 | 0.45 | — | 20% | 2.80 | 1.5 | 109 |
| 137 | Pune | Kharadi | 380 | 13 | 0.47 | — | 40% | 2.50 | 2.0 | 113 |
| 138 | Pune | Hadapsar | 386 | 13 | 0.48 | — | 20% | 2.90 | 1.5 | 111 |
| 139 | Pune | Magarpatta | 391 | 14 | 0.49 | night | 10% | 3.10 | 2.0 | 112 |
| 140 | Pune | Wanowrie | 396 | 14 | 0.51 | rain | 0% | 3.10 | — | — |
| 141 | Pune | Kondhwa | 402 | 14 | 0.52 | — | 0% | 3.40 | — | — |
| 142 | Pune | Swargate | 409 | 15 | 0.54 | — | 0% | 3.10 | — | — |
| 143 | Pune | Sinhagad Road | 417 | 15 | 0.56 | — | 0% | 3.10 | — | — |
| 144 | Pune | Aundh | 424 | 16 | 0.58 | — | 0% | 3.20 | — | — |
| 145 | Pune | Baner | 431 | 16 | 0.60 | rain | 0% | 3.20 | — | — |
| 146 | Pune | Pashan | 438 | 16 | 0.62 | night | 0% | 3.30 | — | — |
| 147 | Pune | Bavdhan | 445 | 17 | 0.64 | — | 0% | 3.10 | — | — |
| 148 | Pune | Wakad | 453 | 17 | 0.66 | — | 0% | 3.20 | — | — |
| 149 | Pune | Pimple Saudagar | 460 | 18 | 0.67 | — | 0% | 3.10 | — | — |
| 150 | Pune | Hinjewadi | 467 | 18 | 0.69 | rain, night | 0% | 3.00 | — | — |
| 151 | Kolkata | Park Street | 336 | 10 | 0.35 | — | 60% | 2.50 | 1.5 | 103 |
| 152 | Kolkata | Chowringhee | 340 | 10 | 0.36 | — | 30% | 2.50 | 2.3 | 100 |
| 153 | Kolkata | Esplanade | 345 | 11 | 0.37 | — | 50% | 2.10 | 2.0 | 102 |
| 154 | Kolkata | Elgin Road | 350 | 11 | 0.39 | — | 80% | 1.50 | 2.1 | 96 |
| 155 | Kolkata | Bhowanipore | 355 | 11 | 0.40 | rain | 50% | 1.80 | 2.6 | 98 |
| 156 | Kolkata | Kalighat | 361 | 12 | 0.41 | — | 40% | 2.00 | 2.5 | 96 |
| 157 | Kolkata | Alipore | 366 | 12 | 0.43 | night | 20% | 2.40 | 3.0 | 91 |
| 158 | Kolkata | Ballygunge | 371 | 12 | 0.44 | — | 50% | 2.50 | 1.8 | 103 |
| 159 | Kolkata | Gariahat | 377 | 13 | 0.46 | — | 10% | 3.00 | 2.0 | 119 |
| 160 | Kolkata | Kasba | 382 | 13 | 0.47 | rain | 30% | 2.60 | 1.7 | 98 |
| 161 | Kolkata | Jadavpur | 387 | 13 | 0.48 | — | 10% | 3.30 | 2.0 | 120 |
| 162 | Kolkata | Tollygunge | 392 | 14 | 0.50 | — | 30% | 3.00 | 1.7 | 103 |
| 163 | Kolkata | Behala | 398 | 14 | 0.51 | — | 0% | 3.10 | — | — |
| 164 | Kolkata | Garia | 404 | 15 | 0.53 | night | 20% | 3.20 | 1.0 | 106 |
| 165 | Kolkata | Entally | 412 | 15 | 0.55 | rain | 0% | 3.00 | — | — |
| 166 | Kolkata | Sealdah | 419 | 15 | 0.57 | — | 20% | 3.10 | 1.5 | 118 |
| 167 | Kolkata | College Street | 426 | 16 | 0.59 | — | 0% | 3.10 | — | — |
| 168 | Kolkata | Burrabazar | 433 | 16 | 0.60 | — | 20% | 2.70 | 2.0 | 98 |
| 169 | Kolkata | Bagbazar | 440 | 17 | 0.62 | — | 0% | 3.00 | — | — |
| 170 | Kolkata | Shyambazar | 448 | 17 | 0.64 | rain | 0% | 3.10 | — | — |
| 171 | Kolkata | Dum Dum | 455 | 17 | 0.66 | night | 0% | 3.00 | — | — |
| 172 | Kolkata | Lake Town | 462 | 18 | 0.68 | — | 0% | 3.00 | — | — |
| 173 | Kolkata | Salt Lake | 469 | 18 | 0.70 | — | 0% | 3.30 | — | — |
| 174 | Kolkata | Rajarhat | 476 | 19 | 0.72 | — | 0% | 3.00 | — | — |
| 175 | Kolkata | New Town | 484 | 19 | 0.74 | rain, night | 0% | 3.30 | — | — |
| 176 | Ahmedabad | Navrangpura | 346 | 11 | 0.38 | — | 50% | 2.00 | 2.2 | 107 |
| 177 | Ahmedabad | CG Road | 352 | 11 | 0.39 | — | 20% | 2.70 | 2.5 | 95 |
| 178 | Ahmedabad | Law Garden | 357 | 11 | 0.40 | — | 70% | 1.60 | 2.0 | 109 |
| 179 | Ahmedabad | Ellisbridge | 362 | 12 | 0.42 | — | 40% | 2.90 | 1.8 | 113 |
| 180 | Ahmedabad | Paldi | 368 | 12 | 0.43 | rain | 10% | 3.10 | 1.0 | 107 |
| 181 | Ahmedabad | Ashram Road | 373 | 12 | 0.45 | — | 10% | 2.90 | 2.0 | 105 |
| 182 | Ahmedabad | Vastrapur | 378 | 13 | 0.46 | night | 20% | 2.90 | 1.0 | 117 |
| 183 | Ahmedabad | Bodakdev | 383 | 13 | 0.47 | — | 0% | 3.00 | — | — |
| 184 | Ahmedabad | Satellite | 389 | 14 | 0.49 | — | 0% | 3.40 | — | — |
| 185 | Ahmedabad | Prahlad Nagar | 394 | 14 | 0.50 | rain | 0% | 3.10 | — | — |
| 186 | Ahmedabad | SG Highway | 399 | 14 | 0.52 | — | 0% | 3.30 | — | — |
| 187 | Ahmedabad | Thaltej | 406 | 15 | 0.53 | — | 0% | 3.00 | — | — |
| 188 | Ahmedabad | Bopal | 414 | 15 | 0.55 | — | 0% | 3.00 | — | — |
| 189 | Ahmedabad | Vejalpur | 421 | 15 | 0.57 | night | 20% | 2.70 | 2.0 | 109 |
| 190 | Ahmedabad | Naranpura | 428 | 16 | 0.59 | rain | 0% | 3.20 | — | — |
| 191 | Ahmedabad | Ghatlodia | 435 | 16 | 0.61 | — | 0% | 3.10 | — | — |
| 192 | Ahmedabad | Gota | 442 | 17 | 0.63 | — | 0% | 3.30 | — | — |
| 193 | Ahmedabad | Chandkheda | 450 | 17 | 0.65 | — | 0% | 3.20 | — | — |
| 194 | Ahmedabad | Shahibaug | 457 | 18 | 0.67 | — | 0% | 3.00 | — | — |
| 195 | Ahmedabad | Kalupur | 464 | 18 | 0.69 | rain | 0% | 3.10 | — | — |
| 196 | Ahmedabad | Naroda | 471 | 18 | 0.70 | night | 0% | 3.00 | — | — |
| 197 | Ahmedabad | Nikol | 478 | 19 | 0.72 | — | 0% | 3.10 | — | — |
| 198 | Ahmedabad | Vastral | 486 | 19 | 0.74 | — | 0% | 3.20 | — | — |
| 199 | Ahmedabad | Maninagar | 493 | 20 | 0.76 | — | 0% | 3.20 | — | — |
| 200 | Ahmedabad | Manek Chowk | 500 | 20 | 0.78 | rain, night | 0% | 3.10 | — | — |
