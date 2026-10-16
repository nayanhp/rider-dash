# Rider Dash balance

Headless check of all 200 generated levels. A deterministic bot (`src/sim/bot.ts`) rides each one on seeds 1, 2, 3, 4, 5. It looks about a second ahead, changes lane once per decision, jumps potholes and speed breakers, and picks up parcels when that lane is clear. Commands wait 8 ticks, so it is not perfect. It does not revive. A level counts as cleared only on a win. Runs are capped at 150 seconds.

Overall clear rate across seeds: **77%**. Level 1 is 100%. The last area is 20%.

The difficulty number is `cityIndex * cityStep + areaFraction * areaSpan`, capped at 1. `cityStep` is 0.057143 and `areaSpan` is 0.6, so the cap lands on the last area of Ahmedabad. It used to be 0.08, which pinned Lake Town through New Town in Kolkata, and Shahibaug through Manek Chowk in Ahmedabad, to the same maximum speed, goal, and density.

## By city

| City | Areas | Clear rate | Avg hits | Speed | Goal | Density |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Bengaluru | 25 | 98% | 0.50 | 260 → 356 | 2 → 7 | 0.15 → 0.42 |
| Mumbai | 25 | 94% | 0.65 | 269 → 365 | 2 → 7 | 0.18 → 0.45 |
| Delhi | 25 | 93% | 0.76 | 278 → 374 | 3 → 8 | 0.20 → 0.47 |
| Hyderabad | 25 | 74% | 1.24 | 287 → 383 | 3 → 8 | 0.23 → 0.50 |
| Chennai | 25 | 71% | 1.33 | 297 → 393 | 4 → 9 | 0.25 → 0.52 |
| Pune | 25 | 70% | 1.38 | 306 → 402 | 4 → 9 | 0.28 → 0.55 |
| Kolkata | 25 | 61% | 1.70 | 315 → 411 | 5 → 10 | 0.30 → 0.57 |
| Ahmedabad | 25 | 54% | 1.86 | 324 → 420 | 5 → 10 | 0.33 → 0.60 |

Clear rate is how often the bot won. Hits include crashes on runs it lost. Hearts and seconds are averaged over wins only. A new city starts easier than the one before it ended; that drop is the curve, not a spike.

## Outliers

- No tuning plateau. No three areas in a row share speed, goal, and density.
- No hard spike. No area inside a city clears at least 60 points below both neighbours.

## Levels

| # | City | Area | Speed | Goal | Density | Weather | Clear | Hits | Hearts | Seconds |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Bengaluru | Koramangala | 260 | 2 | 0.15 | — | 100% | 0.40 | 2.6 | 43 |
| 2 | Bengaluru | Indiranagar | 264 | 2 | 0.16 | — | 100% | 0.40 | 2.6 | 43 |
| 3 | Bengaluru | HSR Layout | 268 | 2 | 0.17 | — | 100% | 0.20 | 2.8 | 40 |
| 4 | Bengaluru | Jayanagar | 272 | 3 | 0.18 | — | 100% | 0.60 | 2.4 | 49 |
| 5 | Bengaluru | BTM Layout | 276 | 3 | 0.19 | rain | 100% | 0.60 | 2.4 | 49 |
| 6 | Bengaluru | Malleshwaram | 280 | 3 | 0.21 | — | 100% | 0.40 | 2.6 | 46 |
| 7 | Bengaluru | Basavanagudi | 284 | 3 | 0.22 | night | 100% | 0.60 | 2.4 | 47 |
| 8 | Bengaluru | JP Nagar | 288 | 3 | 0.23 | — | 100% | 0.20 | 2.8 | 45 |
| 9 | Bengaluru | MG Road | 292 | 4 | 0.24 | — | 100% | 0.40 | 2.6 | 53 |
| 10 | Bengaluru | Ulsoor | 296 | 4 | 0.25 | rain | 100% | 0.20 | 2.8 | 52 |
| 11 | Bengaluru | Frazer Town | 300 | 4 | 0.26 | — | 100% | 0.20 | 2.8 | 51 |
| 12 | Bengaluru | Rajajinagar | 304 | 4 | 0.27 | — | 100% | 0.40 | 2.6 | 51 |
| 13 | Bengaluru | Banashankari | 308 | 4 | 0.28 | — | 100% | 0.20 | 2.8 | 50 |
| 14 | Bengaluru | Vijayanagar | 312 | 5 | 0.30 | night | 100% | 0.60 | 2.4 | 61 |
| 15 | Bengaluru | Bellandur | 316 | 5 | 0.31 | rain | 100% | 0.40 | 2.6 | 61 |
| 16 | Bengaluru | Sarjapur Road | 320 | 5 | 0.32 | — | 100% | 0.60 | 2.4 | 61 |
| 17 | Bengaluru | Marathahalli | 324 | 5 | 0.33 | — | 100% | 0.20 | 2.8 | 57 |
| 18 | Bengaluru | Whitefield | 328 | 5 | 0.34 | — | 80% | 0.80 | 2.8 | 54 |
| 19 | Bengaluru | Bannerghatta Road | 332 | 6 | 0.35 | — | 100% | 0.60 | 2.4 | 62 |
| 20 | Bengaluru | Electronic City | 336 | 6 | 0.36 | rain | 100% | 0.40 | 2.6 | 62 |
| 21 | Bengaluru | Hebbal | 340 | 6 | 0.38 | night | 80% | 1.20 | 2.3 | 55 |
| 22 | Bengaluru | RT Nagar | 344 | 6 | 0.39 | — | 100% | 0.40 | 2.6 | 58 |
| 23 | Bengaluru | Hennur | 348 | 6 | 0.40 | — | 100% | 0.80 | 2.2 | 62 |
| 24 | Bengaluru | Yelahanka | 352 | 7 | 0.41 | — | 100% | 0.60 | 2.4 | 66 |
| 25 | Bengaluru | Sadashivanagar | 356 | 7 | 0.42 | rain, night | 80% | 1.00 | 2.5 | 60 |
| 26 | Mumbai | Bandra | 269 | 2 | 0.18 | — | 100% | 0.00 | 3.0 | 40 |
| 27 | Mumbai | Khar | 273 | 3 | 0.19 | — | 100% | 0.20 | 2.8 | 47 |
| 28 | Mumbai | Santacruz | 277 | 3 | 0.20 | rain | 100% | 0.60 | 2.4 | 50 |
| 29 | Mumbai | Juhu | 281 | 3 | 0.21 | — | 100% | 0.40 | 2.6 | 49 |
| 30 | Mumbai | Vile Parle | 285 | 3 | 0.22 | — | 100% | 0.40 | 2.6 | 49 |
| 31 | Mumbai | Andheri | 289 | 3 | 0.23 | rain | 100% | 0.40 | 2.6 | 48 |
| 32 | Mumbai | Versova | 293 | 4 | 0.24 | night | 100% | 0.60 | 2.4 | 54 |
| 33 | Mumbai | Goregaon | 297 | 4 | 0.25 | — | 100% | 0.40 | 2.6 | 55 |
| 34 | Mumbai | Malad | 301 | 4 | 0.27 | rain | 100% | 0.80 | 2.2 | 60 |
| 35 | Mumbai | Kandivali | 305 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 56 |
| 36 | Mumbai | Borivali | 309 | 4 | 0.29 | — | 100% | 0.80 | 2.2 | 55 |
| 37 | Mumbai | Powai | 313 | 5 | 0.30 | rain | 80% | 0.80 | 2.8 | 58 |
| 38 | Mumbai | Ghatkopar | 317 | 5 | 0.31 | — | 80% | 0.80 | 2.8 | 58 |
| 39 | Mumbai | Kurla | 321 | 5 | 0.32 | night | 80% | 0.80 | 2.8 | 57 |
| 40 | Mumbai | Chembur | 325 | 5 | 0.33 | rain | 80% | 1.20 | 2.3 | 60 |
| 41 | Mumbai | Sion | 329 | 5 | 0.34 | — | 100% | 1.00 | 2.0 | 57 |
| 42 | Mumbai | Wadala | 333 | 6 | 0.36 | — | 100% | 0.60 | 2.4 | 65 |
| 43 | Mumbai | Matunga | 337 | 6 | 0.37 | rain | 100% | 0.20 | 2.8 | 58 |
| 44 | Mumbai | Dadar | 341 | 6 | 0.38 | — | 100% | 0.60 | 2.4 | 59 |
| 45 | Mumbai | Worli | 345 | 6 | 0.39 | — | 100% | 0.40 | 2.6 | 58 |
| 46 | Mumbai | Lower Parel | 349 | 6 | 0.40 | rain, night | 100% | 0.20 | 2.8 | 58 |
| 47 | Mumbai | Byculla | 353 | 7 | 0.41 | — | 100% | 0.60 | 2.4 | 62 |
| 48 | Mumbai | Marine Lines | 357 | 7 | 0.42 | — | 80% | 1.00 | 2.5 | 61 |
| 49 | Mumbai | Mulund | 361 | 7 | 0.43 | rain | 80% | 0.80 | 2.8 | 63 |
| 50 | Mumbai | Colaba | 365 | 7 | 0.45 | night | 60% | 1.80 | 2.0 | 62 |
| 51 | Delhi | Connaught Place | 278 | 3 | 0.20 | — | 100% | 0.40 | 2.6 | 48 |
| 52 | Delhi | Karol Bagh | 282 | 3 | 0.21 | — | 100% | 0.40 | 2.6 | 49 |
| 53 | Delhi | Paharganj | 286 | 3 | 0.22 | — | 100% | 0.40 | 2.6 | 48 |
| 54 | Delhi | Rajouri Garden | 290 | 4 | 0.24 | — | 100% | 0.60 | 2.4 | 55 |
| 55 | Delhi | Janakpuri | 294 | 4 | 0.25 | rain | 100% | 0.60 | 2.4 | 54 |
| 56 | Delhi | Dwarka | 298 | 4 | 0.26 | — | 100% | 0.60 | 2.4 | 58 |
| 57 | Delhi | Lajpat Nagar | 302 | 4 | 0.27 | night | 100% | 0.40 | 2.6 | 51 |
| 58 | Delhi | Defence Colony | 306 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 56 |
| 59 | Delhi | Green Park | 310 | 5 | 0.29 | — | 100% | 0.60 | 2.4 | 56 |
| 60 | Delhi | Hauz Khas | 314 | 5 | 0.30 | rain | 80% | 0.80 | 2.8 | 58 |
| 61 | Delhi | Malviya Nagar | 318 | 5 | 0.31 | — | 80% | 0.80 | 2.8 | 57 |
| 62 | Delhi | Saket | 322 | 5 | 0.33 | — | 80% | 0.80 | 2.8 | 56 |
| 63 | Delhi | Sarojini Nagar | 326 | 5 | 0.34 | — | 100% | 1.00 | 2.0 | 58 |
| 64 | Delhi | Vasant Kunj | 330 | 6 | 0.35 | night | 100% | 1.00 | 2.0 | 65 |
| 65 | Delhi | Greater Kailash | 334 | 6 | 0.36 | rain | 100% | 0.00 | 3.0 | 60 |
| 66 | Delhi | Kalkaji | 338 | 6 | 0.37 | — | 100% | 0.60 | 2.4 | 59 |
| 67 | Delhi | Nehru Place | 342 | 6 | 0.38 | — | 100% | 0.60 | 2.4 | 59 |
| 68 | Delhi | Mayur Vihar | 346 | 6 | 0.39 | — | 80% | 1.00 | 2.5 | 54 |
| 69 | Delhi | Laxmi Nagar | 350 | 7 | 0.40 | — | 100% | 1.00 | 2.0 | 62 |
| 70 | Delhi | Shahdara | 354 | 7 | 0.42 | rain | 100% | 0.00 | 3.0 | 64 |
| 71 | Delhi | Model Town | 358 | 7 | 0.43 | night | 80% | 1.00 | 2.5 | 65 |
| 72 | Delhi | Pitampura | 362 | 7 | 0.44 | — | 80% | 1.00 | 2.5 | 64 |
| 73 | Delhi | Rohini | 366 | 7 | 0.45 | — | 80% | 1.40 | 2.0 | 67 |
| 74 | Delhi | Chanakyapuri | 370 | 8 | 0.46 | — | 80% | 1.80 | 1.5 | 73 |
| 75 | Delhi | Chandni Chowk | 374 | 8 | 0.47 | rain, night | 80% | 1.40 | 2.0 | 67 |
| 76 | Hyderabad | Ameerpet | 287 | 3 | 0.23 | — | 100% | 0.40 | 2.6 | 48 |
| 77 | Hyderabad | Begumpet | 291 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 56 |
| 78 | Hyderabad | Somajiguda | 295 | 4 | 0.25 | — | 100% | 1.00 | 2.0 | 57 |
| 79 | Hyderabad | Banjara Hills | 299 | 4 | 0.26 | — | 80% | 0.80 | 2.8 | 54 |
| 80 | Hyderabad | Jubilee Hills | 303 | 4 | 0.27 | rain | 80% | 0.60 | 3.0 | 51 |
| 81 | Hyderabad | Madhapur | 307 | 4 | 0.28 | — | 80% | 1.00 | 2.5 | 57 |
| 82 | Hyderabad | HITEC City | 311 | 5 | 0.29 | night | 60% | 1.40 | 2.7 | 61 |
| 83 | Hyderabad | Gachibowli | 315 | 5 | 0.31 | — | 80% | 0.80 | 2.8 | 61 |
| 84 | Hyderabad | Kondapur | 319 | 5 | 0.32 | — | 80% | 0.80 | 2.8 | 60 |
| 85 | Hyderabad | Manikonda | 323 | 5 | 0.33 | rain | 80% | 1.00 | 2.5 | 59 |
| 86 | Hyderabad | Tolichowki | 327 | 5 | 0.34 | — | 100% | 0.80 | 2.2 | 57 |
| 87 | Hyderabad | Mehdipatnam | 331 | 6 | 0.35 | — | 100% | 0.80 | 2.2 | 66 |
| 88 | Hyderabad | Kukatpally | 335 | 6 | 0.36 | — | 100% | 0.60 | 2.4 | 61 |
| 89 | Hyderabad | Miyapur | 339 | 6 | 0.37 | night | 80% | 0.80 | 2.8 | 58 |
| 90 | Hyderabad | Kompally | 343 | 6 | 0.38 | rain | 100% | 0.20 | 2.8 | 54 |
| 91 | Hyderabad | Secunderabad | 347 | 6 | 0.40 | — | 100% | 0.60 | 2.4 | 61 |
| 92 | Hyderabad | Tarnaka | 351 | 7 | 0.41 | — | 80% | 1.20 | 2.3 | 65 |
| 93 | Hyderabad | Uppal | 355 | 7 | 0.42 | — | 80% | 1.20 | 2.3 | 65 |
| 94 | Hyderabad | Himayatnagar | 359 | 7 | 0.43 | — | 60% | 1.80 | 2.0 | 67 |
| 95 | Hyderabad | Abids | 363 | 7 | 0.44 | rain | 40% | 2.20 | 2.0 | 59 |
| 96 | Hyderabad | Nampally | 367 | 7 | 0.45 | night | 60% | 2.00 | 1.7 | 66 |
| 97 | Hyderabad | Malakpet | 371 | 8 | 0.46 | — | 0% | 3.00 | — | — |
| 98 | Hyderabad | Dilsukhnagar | 375 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 99 | Hyderabad | LB Nagar | 379 | 8 | 0.49 | — | 40% | 2.40 | 1.5 | 71 |
| 100 | Hyderabad | Charminar | 383 | 8 | 0.50 | rain, night | 60% | 1.80 | 2.0 | 72 |
| 101 | Chennai | T. Nagar | 297 | 4 | 0.25 | — | 100% | 0.60 | 2.4 | 58 |
| 102 | Chennai | Mylapore | 301 | 4 | 0.26 | — | 80% | 1.00 | 2.5 | 55 |
| 103 | Chennai | Alwarpet | 305 | 4 | 0.28 | — | 80% | 1.00 | 2.5 | 58 |
| 104 | Chennai | Nungambakkam | 309 | 4 | 0.29 | — | 80% | 1.00 | 2.5 | 57 |
| 105 | Chennai | Egmore | 313 | 5 | 0.30 | rain | 80% | 1.00 | 2.5 | 61 |
| 106 | Chennai | Kilpauk | 317 | 5 | 0.31 | — | 80% | 0.80 | 2.8 | 60 |
| 107 | Chennai | Anna Nagar | 321 | 5 | 0.32 | night | 80% | 1.00 | 2.5 | 60 |
| 108 | Chennai | Ashok Nagar | 325 | 5 | 0.33 | — | 80% | 1.00 | 2.5 | 59 |
| 109 | Chennai | KK Nagar | 329 | 5 | 0.34 | — | 100% | 0.80 | 2.2 | 57 |
| 110 | Chennai | Vadapalani | 333 | 6 | 0.35 | rain | 100% | 0.40 | 2.6 | 62 |
| 111 | Chennai | Kodambakkam | 337 | 6 | 0.37 | — | 80% | 0.80 | 2.8 | 58 |
| 112 | Chennai | Saidapet | 341 | 6 | 0.38 | — | 80% | 0.80 | 2.8 | 58 |
| 113 | Chennai | Guindy | 345 | 6 | 0.39 | — | 80% | 0.60 | 3.0 | 57 |
| 114 | Chennai | Velachery | 349 | 6 | 0.40 | night | 100% | 0.60 | 2.4 | 61 |
| 115 | Chennai | Adyar | 353 | 7 | 0.41 | rain | 100% | 0.80 | 2.2 | 61 |
| 116 | Chennai | Besant Nagar | 357 | 7 | 0.42 | — | 60% | 1.80 | 2.0 | 63 |
| 117 | Chennai | Thiruvanmiyur | 361 | 7 | 0.43 | — | 60% | 1.80 | 2.0 | 66 |
| 118 | Chennai | Perungudi | 365 | 7 | 0.44 | — | 60% | 2.20 | 1.3 | 72 |
| 119 | Chennai | Sholinganallur | 369 | 7 | 0.46 | — | 60% | 1.40 | 2.7 | 67 |
| 120 | Chennai | Porur | 373 | 8 | 0.47 | rain | 20% | 2.60 | 2.0 | 67 |
| 121 | Chennai | Chromepet | 377 | 8 | 0.48 | night | 40% | 2.40 | 1.5 | 73 |
| 122 | Chennai | Tambaram | 381 | 8 | 0.49 | — | 0% | 3.00 | — | — |
| 123 | Chennai | Perambur | 385 | 8 | 0.50 | — | 40% | 2.40 | 1.5 | 69 |
| 124 | Chennai | Royapettah | 389 | 8 | 0.51 | — | 60% | 1.80 | 2.0 | 70 |
| 125 | Chennai | Triplicane | 393 | 9 | 0.52 | rain, night | 80% | 1.60 | 1.8 | 80 |
| 126 | Pune | Shivajinagar | 306 | 4 | 0.28 | — | 80% | 1.00 | 2.5 | 58 |
| 127 | Pune | Deccan | 310 | 4 | 0.29 | — | 80% | 1.00 | 2.5 | 58 |
| 128 | Pune | Sadashiv Peth | 314 | 5 | 0.30 | — | 80% | 0.80 | 2.8 | 61 |
| 129 | Pune | Erandwane | 318 | 5 | 0.31 | — | 80% | 1.00 | 2.5 | 60 |
| 130 | Pune | Kothrud | 322 | 5 | 0.32 | rain | 80% | 1.00 | 2.5 | 59 |
| 131 | Pune | Karve Nagar | 326 | 5 | 0.33 | — | 100% | 0.80 | 2.2 | 58 |
| 132 | Pune | Camp | 330 | 5 | 0.35 | night | 100% | 0.40 | 2.6 | 57 |
| 133 | Pune | Koregaon Park | 334 | 6 | 0.36 | — | 100% | 0.60 | 2.4 | 61 |
| 134 | Pune | Kalyani Nagar | 338 | 6 | 0.37 | — | 80% | 0.80 | 2.8 | 58 |
| 135 | Pune | Viman Nagar | 342 | 6 | 0.38 | rain | 100% | 0.60 | 2.4 | 59 |
| 136 | Pune | Yerawada | 346 | 6 | 0.39 | — | 100% | 0.00 | 3.0 | 55 |
| 137 | Pune | Kharadi | 350 | 6 | 0.40 | — | 100% | 0.60 | 2.4 | 58 |
| 138 | Pune | Hadapsar | 354 | 7 | 0.41 | — | 100% | 0.80 | 2.2 | 65 |
| 139 | Pune | Magarpatta | 358 | 7 | 0.42 | night | 80% | 1.20 | 2.3 | 65 |
| 140 | Pune | Wanowrie | 362 | 7 | 0.44 | rain | 60% | 1.20 | 3.0 | 61 |
| 141 | Pune | Kondhwa | 366 | 7 | 0.45 | — | 60% | 1.40 | 2.7 | 67 |
| 142 | Pune | Swargate | 370 | 7 | 0.46 | — | 60% | 1.40 | 2.7 | 66 |
| 143 | Pune | Sinhagad Road | 374 | 8 | 0.47 | — | 40% | 2.40 | 1.5 | 73 |
| 144 | Pune | Aundh | 378 | 8 | 0.48 | — | 20% | 2.80 | 1.0 | 69 |
| 145 | Pune | Baner | 382 | 8 | 0.49 | rain | 0% | 3.00 | — | — |
| 146 | Pune | Pashan | 386 | 8 | 0.50 | night | 40% | 2.40 | 1.5 | 69 |
| 147 | Pune | Bavdhan | 390 | 8 | 0.51 | — | 40% | 2.20 | 2.0 | 70 |
| 148 | Pune | Wakad | 394 | 9 | 0.53 | — | 40% | 2.60 | 1.0 | 72 |
| 149 | Pune | Pimple Saudagar | 398 | 9 | 0.54 | — | 80% | 1.80 | 1.5 | 75 |
| 150 | Pune | Hinjewadi | 402 | 9 | 0.55 | rain, night | 40% | 2.60 | 1.0 | 74 |
| 151 | Kolkata | Park Street | 315 | 5 | 0.30 | — | 80% | 0.80 | 2.8 | 61 |
| 152 | Kolkata | Chowringhee | 319 | 5 | 0.32 | — | 80% | 0.80 | 2.8 | 60 |
| 153 | Kolkata | Esplanade | 323 | 5 | 0.33 | — | 80% | 1.00 | 2.5 | 59 |
| 154 | Kolkata | Elgin Road | 327 | 5 | 0.34 | — | 100% | 0.80 | 2.2 | 57 |
| 155 | Kolkata | Bhowanipore | 331 | 6 | 0.35 | rain | 80% | 1.00 | 2.5 | 64 |
| 156 | Kolkata | Kalighat | 335 | 6 | 0.36 | — | 100% | 0.60 | 2.4 | 61 |
| 157 | Kolkata | Alipore | 339 | 6 | 0.37 | night | 80% | 0.80 | 2.8 | 58 |
| 158 | Kolkata | Ballygunge | 343 | 6 | 0.38 | — | 100% | 0.20 | 2.8 | 54 |
| 159 | Kolkata | Gariahat | 347 | 6 | 0.39 | — | 80% | 0.60 | 3.0 | 57 |
| 160 | Kolkata | Kasba | 351 | 7 | 0.41 | rain | 100% | 0.80 | 2.2 | 64 |
| 161 | Kolkata | Jadavpur | 355 | 7 | 0.42 | — | 80% | 1.20 | 2.3 | 65 |
| 162 | Kolkata | Tollygunge | 359 | 7 | 0.43 | — | 60% | 1.80 | 2.0 | 67 |
| 163 | Kolkata | Behala | 363 | 7 | 0.44 | — | 60% | 2.20 | 1.3 | 72 |
| 164 | Kolkata | Garia | 367 | 7 | 0.45 | night | 60% | 2.20 | 1.3 | 66 |
| 165 | Kolkata | Entally | 371 | 8 | 0.46 | rain | 0% | 3.00 | — | — |
| 166 | Kolkata | Sealdah | 375 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 167 | Kolkata | College Street | 379 | 8 | 0.48 | — | 20% | 2.80 | 1.0 | 66 |
| 168 | Kolkata | Burrabazar | 383 | 8 | 0.50 | — | 60% | 2.20 | 1.3 | 72 |
| 169 | Kolkata | Bagbazar | 387 | 8 | 0.51 | — | 60% | 2.20 | 1.3 | 70 |
| 170 | Kolkata | Shyambazar | 391 | 9 | 0.52 | rain | 80% | 1.60 | 1.8 | 79 |
| 171 | Kolkata | Dum Dum | 395 | 9 | 0.53 | night | 40% | 2.60 | 1.0 | 71 |
| 172 | Kolkata | Lake Town | 399 | 9 | 0.54 | — | 60% | 2.00 | 1.7 | 79 |
| 173 | Kolkata | Salt Lake | 403 | 9 | 0.55 | — | 20% | 2.60 | 2.0 | 57 |
| 174 | Kolkata | Rajarhat | 407 | 9 | 0.56 | — | 0% | 3.00 | — | — |
| 175 | Kolkata | New Town | 411 | 10 | 0.57 | rain, night | 40% | 2.60 | 1.0 | 75 |
| 176 | Ahmedabad | Navrangpura | 324 | 5 | 0.33 | — | 80% | 1.00 | 2.5 | 59 |
| 177 | Ahmedabad | CG Road | 328 | 5 | 0.34 | — | 100% | 0.80 | 2.2 | 57 |
| 178 | Ahmedabad | Law Garden | 332 | 6 | 0.35 | — | 100% | 0.40 | 2.6 | 63 |
| 179 | Ahmedabad | Ellisbridge | 336 | 6 | 0.36 | — | 100% | 0.60 | 2.4 | 61 |
| 180 | Ahmedabad | Paldi | 340 | 6 | 0.38 | rain | 100% | 0.20 | 2.8 | 55 |
| 181 | Ahmedabad | Ashram Road | 344 | 6 | 0.39 | — | 80% | 0.60 | 3.0 | 57 |
| 182 | Ahmedabad | Vastrapur | 348 | 6 | 0.40 | night | 100% | 0.60 | 2.4 | 61 |
| 183 | Ahmedabad | Bodakdev | 352 | 7 | 0.41 | — | 80% | 1.20 | 2.3 | 65 |
| 184 | Ahmedabad | Satellite | 356 | 7 | 0.42 | — | 60% | 1.80 | 2.0 | 63 |
| 185 | Ahmedabad | Prahlad Nagar | 360 | 7 | 0.43 | rain | 60% | 1.80 | 2.0 | 62 |
| 186 | Ahmedabad | SG Highway | 364 | 7 | 0.44 | — | 60% | 2.20 | 1.3 | 72 |
| 187 | Ahmedabad | Thaltej | 368 | 7 | 0.45 | — | 60% | 2.20 | 1.3 | 66 |
| 188 | Ahmedabad | Bopal | 372 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 189 | Ahmedabad | Vejalpur | 376 | 8 | 0.48 | night | 0% | 3.00 | — | — |
| 190 | Ahmedabad | Naranpura | 380 | 8 | 0.49 | rain | 0% | 3.00 | — | — |
| 191 | Ahmedabad | Ghatlodia | 384 | 8 | 0.50 | — | 40% | 2.40 | 1.5 | 69 |
| 192 | Ahmedabad | Gota | 388 | 8 | 0.51 | — | 60% | 2.00 | 1.7 | 71 |
| 193 | Ahmedabad | Chandkheda | 392 | 9 | 0.52 | — | 40% | 2.20 | 2.0 | 77 |
| 194 | Ahmedabad | Shahibaug | 396 | 9 | 0.53 | — | 60% | 2.40 | 1.0 | 73 |
| 195 | Ahmedabad | Kalupur | 400 | 9 | 0.54 | rain | 60% | 1.80 | 2.0 | 73 |
| 196 | Ahmedabad | Naroda | 404 | 9 | 0.56 | night | 0% | 3.00 | — | — |
| 197 | Ahmedabad | Nikol | 408 | 9 | 0.57 | — | 40% | 2.60 | 1.0 | 64 |
| 198 | Ahmedabad | Vastral | 412 | 10 | 0.58 | — | 40% | 2.40 | 1.5 | 69 |
| 199 | Ahmedabad | Maninagar | 416 | 10 | 0.59 | — | 20% | 2.80 | 1.0 | 81 |
| 200 | Ahmedabad | Manek Chowk | 420 | 10 | 0.60 | rain, night | 20% | 2.60 | 2.0 | 80 |
