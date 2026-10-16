# Rider Dash balance

Headless check of all 200 generated levels. A deterministic bot (`src/sim/bot.ts`) rides each one on seeds 1, 2, 3, 4, 5. It looks about a second ahead, changes lane once per decision, jumps potholes and speed breakers, and picks up parcels when that lane is clear. Commands wait 8 ticks, so it is not perfect. It does not revive. A level counts as cleared only on a win. Runs are capped at 150 seconds.

Overall clear rate across seeds: **63%**. Level 1 is 100%. The last area is 60%.

The difficulty number is `cityIndex * cityStep + areaFraction * areaSpan`, capped at 1. `cityStep` is 0.057143 and `areaSpan` is 0.6, so the cap lands on the last area of Ahmedabad. It used to be 0.08, which pinned Lake Town through New Town in Kolkata, and Shahibaug through Manek Chowk in Ahmedabad, to the same maximum speed, goal, and density.

## By city

| City | Areas | Clear rate | Avg hits | Speed | Goal | Density |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Bengaluru | 25 | 87% | 1.18 | 260 → 356 | 2 → 7 | 0.15 → 0.42 |
| Mumbai | 25 | 80% | 1.37 | 269 → 365 | 2 → 7 | 0.18 → 0.45 |
| Delhi | 25 | 74% | 1.62 | 278 → 374 | 3 → 8 | 0.20 → 0.47 |
| Hyderabad | 25 | 66% | 1.78 | 287 → 383 | 3 → 8 | 0.23 → 0.50 |
| Chennai | 25 | 59% | 1.98 | 297 → 393 | 4 → 9 | 0.25 → 0.52 |
| Pune | 25 | 54% | 2.14 | 306 → 402 | 4 → 9 | 0.28 → 0.55 |
| Kolkata | 25 | 46% | 2.30 | 315 → 411 | 5 → 10 | 0.30 → 0.57 |
| Ahmedabad | 25 | 39% | 2.40 | 324 → 420 | 5 → 10 | 0.33 → 0.60 |

Clear rate is how often the bot won. Hits include crashes on runs it lost. Hearts and seconds are averaged over wins only. A new city starts easier than the one before it ended; that drop is the curve, not a spike.

## Outliers

- No tuning plateau. No three areas in a row share speed, goal, and density.
- No hard spike. No area inside a city clears at least 60 points below both neighbours.

## Levels

| # | City | Area | Speed | Goal | Density | Weather | Clear | Hits | Hearts | Seconds |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Bengaluru | Koramangala | 260 | 2 | 0.15 | — | 100% | 0.40 | 2.6 | 43 |
| 2 | Bengaluru | Indiranagar | 264 | 2 | 0.16 | — | 100% | 0.40 | 2.6 | 42 |
| 3 | Bengaluru | HSR Layout | 268 | 2 | 0.17 | — | 100% | 0.20 | 2.8 | 40 |
| 4 | Bengaluru | Jayanagar | 272 | 3 | 0.18 | — | 100% | 0.60 | 2.4 | 49 |
| 5 | Bengaluru | BTM Layout | 276 | 3 | 0.19 | rain | 100% | 0.60 | 2.4 | 48 |
| 6 | Bengaluru | Malleshwaram | 280 | 3 | 0.21 | — | 100% | 0.60 | 2.4 | 48 |
| 7 | Bengaluru | Basavanagudi | 284 | 3 | 0.22 | night | 100% | 0.80 | 2.2 | 47 |
| 8 | Bengaluru | JP Nagar | 288 | 3 | 0.23 | — | 100% | 0.60 | 2.4 | 47 |
| 9 | Bengaluru | MG Road | 292 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 53 |
| 10 | Bengaluru | Ulsoor | 296 | 4 | 0.25 | rain | 100% | 0.80 | 2.2 | 52 |
| 11 | Bengaluru | Frazer Town | 300 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 52 |
| 12 | Bengaluru | Rajajinagar | 304 | 4 | 0.27 | — | 100% | 0.80 | 2.2 | 51 |
| 13 | Bengaluru | Banashankari | 308 | 4 | 0.28 | — | 100% | 0.60 | 2.4 | 50 |
| 14 | Bengaluru | Vijayanagar | 312 | 5 | 0.30 | night | 100% | 1.00 | 2.0 | 57 |
| 15 | Bengaluru | Bellandur | 316 | 5 | 0.31 | rain | 100% | 1.00 | 2.0 | 57 |
| 16 | Bengaluru | Sarjapur Road | 320 | 5 | 0.32 | — | 100% | 1.00 | 2.0 | 56 |
| 17 | Bengaluru | Marathahalli | 324 | 5 | 0.33 | — | 100% | 1.40 | 1.6 | 60 |
| 18 | Bengaluru | Whitefield | 328 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 60 |
| 19 | Bengaluru | Bannerghatta Road | 332 | 6 | 0.35 | — | 80% | 2.00 | 1.3 | 67 |
| 20 | Bengaluru | Electronic City | 336 | 6 | 0.36 | rain | 80% | 1.60 | 1.8 | 61 |
| 21 | Bengaluru | Hebbal | 340 | 6 | 0.38 | night | 40% | 2.40 | 1.5 | 65 |
| 22 | Bengaluru | RT Nagar | 344 | 6 | 0.39 | — | 60% | 2.20 | 1.3 | 67 |
| 23 | Bengaluru | Hennur | 348 | 6 | 0.40 | — | 60% | 2.20 | 1.3 | 61 |
| 24 | Bengaluru | Yelahanka | 352 | 7 | 0.41 | — | 20% | 2.80 | 1.0 | 69 |
| 25 | Bengaluru | Sadashivanagar | 356 | 7 | 0.42 | rain, night | 40% | 2.40 | 1.5 | 68 |
| 26 | Mumbai | Bandra | 269 | 2 | 0.18 | — | 100% | 0.60 | 2.4 | 42 |
| 27 | Mumbai | Khar | 273 | 3 | 0.19 | — | 100% | 0.60 | 2.4 | 49 |
| 28 | Mumbai | Santacruz | 277 | 3 | 0.20 | rain | 100% | 0.60 | 2.4 | 48 |
| 29 | Mumbai | Juhu | 281 | 3 | 0.21 | — | 100% | 0.60 | 2.4 | 48 |
| 30 | Mumbai | Vile Parle | 285 | 3 | 0.22 | — | 100% | 0.80 | 2.2 | 47 |
| 31 | Mumbai | Andheri | 289 | 3 | 0.23 | rain | 100% | 0.60 | 2.4 | 46 |
| 32 | Mumbai | Versova | 293 | 4 | 0.24 | night | 100% | 0.80 | 2.2 | 53 |
| 33 | Mumbai | Goregaon | 297 | 4 | 0.25 | — | 100% | 0.80 | 2.2 | 52 |
| 34 | Mumbai | Malad | 301 | 4 | 0.27 | rain | 100% | 0.80 | 2.2 | 51 |
| 35 | Mumbai | Kandivali | 305 | 4 | 0.28 | — | 100% | 0.60 | 2.4 | 51 |
| 36 | Mumbai | Borivali | 309 | 4 | 0.29 | — | 100% | 0.60 | 2.4 | 50 |
| 37 | Mumbai | Powai | 313 | 5 | 0.30 | rain | 100% | 1.00 | 2.0 | 57 |
| 38 | Mumbai | Ghatkopar | 317 | 5 | 0.31 | — | 100% | 1.00 | 2.0 | 57 |
| 39 | Mumbai | Kurla | 321 | 5 | 0.32 | night | 100% | 1.00 | 2.0 | 56 |
| 40 | Mumbai | Chembur | 325 | 5 | 0.33 | rain | 100% | 1.00 | 2.0 | 55 |
| 41 | Mumbai | Sion | 329 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 59 |
| 42 | Mumbai | Wadala | 333 | 6 | 0.36 | — | 80% | 2.00 | 1.3 | 66 |
| 43 | Mumbai | Matunga | 337 | 6 | 0.37 | rain | 60% | 2.00 | 1.7 | 61 |
| 44 | Mumbai | Dadar | 341 | 6 | 0.38 | — | 60% | 2.40 | 1.0 | 67 |
| 45 | Mumbai | Worli | 345 | 6 | 0.39 | — | 60% | 2.20 | 1.3 | 66 |
| 46 | Mumbai | Lower Parel | 349 | 6 | 0.40 | rain, night | 60% | 1.80 | 2.0 | 55 |
| 47 | Mumbai | Byculla | 353 | 7 | 0.41 | — | 0% | 3.00 | — | — |
| 48 | Mumbai | Marine Lines | 357 | 7 | 0.42 | — | 20% | 2.80 | 1.0 | 67 |
| 49 | Mumbai | Mulund | 361 | 7 | 0.43 | rain | 40% | 2.40 | 1.5 | 68 |
| 50 | Mumbai | Colaba | 365 | 7 | 0.45 | night | 20% | 2.80 | 1.0 | 66 |
| 51 | Delhi | Connaught Place | 278 | 3 | 0.20 | — | 100% | 0.60 | 2.4 | 48 |
| 52 | Delhi | Karol Bagh | 282 | 3 | 0.21 | — | 100% | 0.60 | 2.4 | 48 |
| 53 | Delhi | Paharganj | 286 | 3 | 0.22 | — | 100% | 0.80 | 2.2 | 47 |
| 54 | Delhi | Rajouri Garden | 290 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 53 |
| 55 | Delhi | Janakpuri | 294 | 4 | 0.25 | rain | 100% | 0.80 | 2.2 | 53 |
| 56 | Delhi | Dwarka | 298 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 52 |
| 57 | Delhi | Lajpat Nagar | 302 | 4 | 0.27 | night | 100% | 0.80 | 2.2 | 51 |
| 58 | Delhi | Defence Colony | 306 | 4 | 0.28 | — | 100% | 0.60 | 2.4 | 51 |
| 59 | Delhi | Green Park | 310 | 5 | 0.29 | — | 100% | 1.00 | 2.0 | 58 |
| 60 | Delhi | Hauz Khas | 314 | 5 | 0.30 | rain | 100% | 1.00 | 2.0 | 57 |
| 61 | Delhi | Malviya Nagar | 318 | 5 | 0.31 | — | 100% | 1.00 | 2.0 | 56 |
| 62 | Delhi | Saket | 322 | 5 | 0.33 | — | 100% | 1.00 | 2.0 | 56 |
| 63 | Delhi | Sarojini Nagar | 326 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 60 |
| 64 | Delhi | Vasant Kunj | 330 | 6 | 0.35 | night | 80% | 2.00 | 1.3 | 67 |
| 65 | Delhi | Greater Kailash | 334 | 6 | 0.36 | rain | 80% | 1.60 | 1.8 | 61 |
| 66 | Delhi | Kalkaji | 338 | 6 | 0.37 | — | 60% | 2.40 | 1.0 | 68 |
| 67 | Delhi | Nehru Place | 342 | 6 | 0.38 | — | 60% | 2.40 | 1.0 | 67 |
| 68 | Delhi | Mayur Vihar | 346 | 6 | 0.39 | — | 40% | 2.60 | 1.0 | 64 |
| 69 | Delhi | Laxmi Nagar | 350 | 7 | 0.40 | — | 20% | 2.80 | 1.0 | 63 |
| 70 | Delhi | Shahdara | 354 | 7 | 0.42 | rain | 40% | 2.40 | 1.5 | 69 |
| 71 | Delhi | Model Town | 358 | 7 | 0.43 | night | 40% | 2.60 | 1.0 | 68 |
| 72 | Delhi | Pitampura | 362 | 7 | 0.44 | — | 60% | 2.40 | 1.0 | 66 |
| 73 | Delhi | Rohini | 366 | 7 | 0.45 | — | 60% | 2.40 | 1.0 | 65 |
| 74 | Delhi | Chanakyapuri | 370 | 8 | 0.46 | — | 20% | 2.80 | 1.0 | 71 |
| 75 | Delhi | Chandni Chowk | 374 | 8 | 0.47 | rain, night | 0% | 3.00 | — | — |
| 76 | Hyderabad | Ameerpet | 287 | 3 | 0.23 | — | 100% | 0.60 | 2.4 | 47 |
| 77 | Hyderabad | Begumpet | 291 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 53 |
| 78 | Hyderabad | Somajiguda | 295 | 4 | 0.25 | — | 100% | 0.80 | 2.2 | 53 |
| 79 | Hyderabad | Banjara Hills | 299 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 52 |
| 80 | Hyderabad | Jubilee Hills | 303 | 4 | 0.27 | rain | 100% | 0.80 | 2.2 | 51 |
| 81 | Hyderabad | Madhapur | 307 | 4 | 0.28 | — | 100% | 0.60 | 2.4 | 51 |
| 82 | Hyderabad | HITEC City | 311 | 5 | 0.29 | night | 100% | 1.00 | 2.0 | 57 |
| 83 | Hyderabad | Gachibowli | 315 | 5 | 0.31 | — | 100% | 1.00 | 2.0 | 57 |
| 84 | Hyderabad | Kondapur | 319 | 5 | 0.32 | — | 100% | 1.00 | 2.0 | 56 |
| 85 | Hyderabad | Manikonda | 323 | 5 | 0.33 | rain | 100% | 1.00 | 2.0 | 55 |
| 86 | Hyderabad | Tolichowki | 327 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 60 |
| 87 | Hyderabad | Mehdipatnam | 331 | 6 | 0.35 | — | 80% | 1.60 | 1.8 | 62 |
| 88 | Hyderabad | Kukatpally | 335 | 6 | 0.36 | — | 80% | 2.00 | 1.3 | 66 |
| 89 | Hyderabad | Miyapur | 339 | 6 | 0.37 | night | 60% | 2.40 | 1.0 | 67 |
| 90 | Hyderabad | Kompally | 343 | 6 | 0.38 | rain | 40% | 2.00 | 2.5 | 55 |
| 91 | Hyderabad | Secunderabad | 347 | 6 | 0.40 | — | 60% | 2.20 | 1.3 | 61 |
| 92 | Hyderabad | Tarnaka | 351 | 7 | 0.41 | — | 20% | 2.80 | 1.0 | 69 |
| 93 | Hyderabad | Uppal | 355 | 7 | 0.42 | — | 40% | 2.60 | 1.0 | 69 |
| 94 | Hyderabad | Himayatnagar | 359 | 7 | 0.43 | — | 60% | 2.40 | 1.0 | 66 |
| 95 | Hyderabad | Abids | 363 | 7 | 0.44 | rain | 20% | 2.80 | 1.0 | 66 |
| 96 | Hyderabad | Nampally | 367 | 7 | 0.45 | night | 40% | 2.60 | 1.0 | 64 |
| 97 | Hyderabad | Malakpet | 371 | 8 | 0.46 | — | 20% | 2.80 | 1.0 | 70 |
| 98 | Hyderabad | Dilsukhnagar | 375 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 99 | Hyderabad | LB Nagar | 379 | 8 | 0.49 | — | 20% | 2.80 | 1.0 | 77 |
| 100 | Hyderabad | Charminar | 383 | 8 | 0.50 | rain, night | 20% | 2.60 | 2.0 | 64 |
| 101 | Chennai | T. Nagar | 297 | 4 | 0.25 | — | 100% | 0.80 | 2.2 | 52 |
| 102 | Chennai | Mylapore | 301 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 52 |
| 103 | Chennai | Alwarpet | 305 | 4 | 0.28 | — | 100% | 0.60 | 2.4 | 51 |
| 104 | Chennai | Nungambakkam | 309 | 4 | 0.29 | — | 100% | 0.60 | 2.4 | 50 |
| 105 | Chennai | Egmore | 313 | 5 | 0.30 | rain | 100% | 1.00 | 2.0 | 57 |
| 106 | Chennai | Kilpauk | 317 | 5 | 0.31 | — | 100% | 1.00 | 2.0 | 57 |
| 107 | Chennai | Anna Nagar | 321 | 5 | 0.32 | night | 100% | 1.00 | 2.0 | 56 |
| 108 | Chennai | Ashok Nagar | 325 | 5 | 0.33 | — | 100% | 1.40 | 1.6 | 60 |
| 109 | Chennai | KK Nagar | 329 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 59 |
| 110 | Chennai | Vadapalani | 333 | 6 | 0.35 | rain | 80% | 1.60 | 1.8 | 62 |
| 111 | Chennai | Kodambakkam | 337 | 6 | 0.37 | — | 60% | 2.40 | 1.0 | 68 |
| 112 | Chennai | Saidapet | 341 | 6 | 0.38 | — | 60% | 2.40 | 1.0 | 67 |
| 113 | Chennai | Guindy | 345 | 6 | 0.39 | — | 60% | 2.20 | 1.3 | 66 |
| 114 | Chennai | Velachery | 349 | 6 | 0.40 | night | 60% | 2.20 | 1.3 | 61 |
| 115 | Chennai | Adyar | 353 | 7 | 0.41 | rain | 40% | 2.20 | 2.0 | 63 |
| 116 | Chennai | Besant Nagar | 357 | 7 | 0.42 | — | 20% | 2.80 | 1.0 | 67 |
| 117 | Chennai | Thiruvanmiyur | 361 | 7 | 0.43 | — | 40% | 2.60 | 1.0 | 68 |
| 118 | Chennai | Perungudi | 365 | 7 | 0.44 | — | 40% | 2.60 | 1.0 | 64 |
| 119 | Chennai | Sholinganallur | 369 | 7 | 0.46 | — | 40% | 2.60 | 1.0 | 64 |
| 120 | Chennai | Porur | 373 | 8 | 0.47 | rain | 0% | 3.00 | — | — |
| 121 | Chennai | Chromepet | 377 | 8 | 0.48 | night | 20% | 2.80 | 1.0 | 77 |
| 122 | Chennai | Tambaram | 381 | 8 | 0.49 | — | 20% | 2.80 | 1.0 | 77 |
| 123 | Chennai | Perambur | 385 | 8 | 0.50 | — | 20% | 2.80 | 1.0 | 72 |
| 124 | Chennai | Royapettah | 389 | 8 | 0.51 | — | 20% | 2.80 | 1.0 | 72 |
| 125 | Chennai | Triplicane | 393 | 9 | 0.52 | rain, night | 0% | 3.00 | — | — |
| 126 | Pune | Shivajinagar | 306 | 4 | 0.28 | — | 100% | 0.60 | 2.4 | 51 |
| 127 | Pune | Deccan | 310 | 4 | 0.29 | — | 100% | 0.60 | 2.4 | 50 |
| 128 | Pune | Sadashiv Peth | 314 | 5 | 0.30 | — | 100% | 1.00 | 2.0 | 57 |
| 129 | Pune | Erandwane | 318 | 5 | 0.31 | — | 100% | 1.00 | 2.0 | 56 |
| 130 | Pune | Kothrud | 322 | 5 | 0.32 | rain | 100% | 1.00 | 2.0 | 56 |
| 131 | Pune | Karve Nagar | 326 | 5 | 0.33 | — | 100% | 1.40 | 1.6 | 60 |
| 132 | Pune | Camp | 330 | 5 | 0.35 | night | 100% | 1.40 | 1.6 | 59 |
| 133 | Pune | Koregaon Park | 334 | 6 | 0.36 | — | 80% | 2.00 | 1.3 | 66 |
| 134 | Pune | Kalyani Nagar | 338 | 6 | 0.37 | — | 60% | 2.40 | 1.0 | 68 |
| 135 | Pune | Viman Nagar | 342 | 6 | 0.38 | rain | 60% | 2.00 | 1.7 | 61 |
| 136 | Pune | Yerawada | 346 | 6 | 0.39 | — | 40% | 2.60 | 1.0 | 64 |
| 137 | Pune | Kharadi | 350 | 6 | 0.40 | — | 40% | 2.60 | 1.0 | 63 |
| 138 | Pune | Hadapsar | 354 | 7 | 0.41 | — | 20% | 2.80 | 1.0 | 69 |
| 139 | Pune | Magarpatta | 358 | 7 | 0.42 | night | 40% | 2.60 | 1.0 | 68 |
| 140 | Pune | Wanowrie | 362 | 7 | 0.44 | rain | 40% | 2.40 | 1.5 | 67 |
| 141 | Pune | Kondhwa | 366 | 7 | 0.45 | — | 60% | 2.40 | 1.0 | 65 |
| 142 | Pune | Swargate | 370 | 7 | 0.46 | — | 40% | 2.60 | 1.0 | 64 |
| 143 | Pune | Sinhagad Road | 374 | 8 | 0.47 | — | 20% | 2.80 | 1.0 | 71 |
| 144 | Pune | Aundh | 378 | 8 | 0.48 | — | 20% | 2.80 | 1.0 | 77 |
| 145 | Pune | Baner | 382 | 8 | 0.49 | rain | 20% | 2.60 | 2.0 | 65 |
| 146 | Pune | Pashan | 386 | 8 | 0.50 | night | 20% | 2.80 | 1.0 | 72 |
| 147 | Pune | Bavdhan | 390 | 8 | 0.51 | — | 20% | 2.80 | 1.0 | 71 |
| 148 | Pune | Wakad | 394 | 9 | 0.53 | — | 20% | 2.80 | 1.0 | 83 |
| 149 | Pune | Pimple Saudagar | 398 | 9 | 0.54 | — | 40% | 2.60 | 1.0 | 76 |
| 150 | Pune | Hinjewadi | 402 | 9 | 0.55 | rain, night | 20% | 2.80 | 1.0 | 82 |
| 151 | Kolkata | Park Street | 315 | 5 | 0.30 | — | 100% | 1.00 | 2.0 | 57 |
| 152 | Kolkata | Chowringhee | 319 | 5 | 0.32 | — | 100% | 1.00 | 2.0 | 56 |
| 153 | Kolkata | Esplanade | 323 | 5 | 0.33 | — | 100% | 1.40 | 1.6 | 61 |
| 154 | Kolkata | Elgin Road | 327 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 60 |
| 155 | Kolkata | Bhowanipore | 331 | 6 | 0.35 | rain | 80% | 1.40 | 2.0 | 59 |
| 156 | Kolkata | Kalighat | 335 | 6 | 0.36 | — | 80% | 1.60 | 1.8 | 61 |
| 157 | Kolkata | Alipore | 339 | 6 | 0.37 | night | 60% | 2.40 | 1.0 | 67 |
| 158 | Kolkata | Ballygunge | 343 | 6 | 0.38 | — | 40% | 2.60 | 1.0 | 64 |
| 159 | Kolkata | Gariahat | 347 | 6 | 0.39 | — | 60% | 2.20 | 1.3 | 66 |
| 160 | Kolkata | Kasba | 351 | 7 | 0.41 | rain | 40% | 2.40 | 1.5 | 69 |
| 161 | Kolkata | Jadavpur | 355 | 7 | 0.42 | — | 40% | 2.60 | 1.0 | 69 |
| 162 | Kolkata | Tollygunge | 359 | 7 | 0.43 | — | 60% | 2.40 | 1.0 | 66 |
| 163 | Kolkata | Behala | 363 | 7 | 0.44 | — | 20% | 2.80 | 1.0 | 66 |
| 164 | Kolkata | Garia | 367 | 7 | 0.45 | night | 40% | 2.60 | 1.0 | 64 |
| 165 | Kolkata | Entally | 371 | 8 | 0.46 | rain | 0% | 3.00 | — | — |
| 166 | Kolkata | Sealdah | 375 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 167 | Kolkata | College Street | 379 | 8 | 0.48 | — | 20% | 2.80 | 1.0 | 77 |
| 168 | Kolkata | Burrabazar | 383 | 8 | 0.50 | — | 20% | 2.80 | 1.0 | 73 |
| 169 | Kolkata | Bagbazar | 387 | 8 | 0.51 | — | 20% | 2.80 | 1.0 | 72 |
| 170 | Kolkata | Shyambazar | 391 | 9 | 0.52 | rain | 0% | 3.00 | — | — |
| 171 | Kolkata | Dum Dum | 395 | 9 | 0.53 | night | 20% | 2.80 | 1.0 | 83 |
| 172 | Kolkata | Lake Town | 399 | 9 | 0.54 | — | 40% | 2.60 | 1.0 | 76 |
| 173 | Kolkata | Salt Lake | 403 | 9 | 0.55 | — | 40% | 2.20 | 2.0 | 77 |
| 174 | Kolkata | Rajarhat | 407 | 9 | 0.56 | — | 40% | 2.20 | 2.0 | 77 |
| 175 | Kolkata | New Town | 411 | 10 | 0.57 | rain, night | 20% | 2.60 | 2.0 | 89 |
| 176 | Ahmedabad | Navrangpura | 324 | 5 | 0.33 | — | 100% | 1.40 | 1.6 | 60 |
| 177 | Ahmedabad | CG Road | 328 | 5 | 0.34 | — | 100% | 1.40 | 1.6 | 60 |
| 178 | Ahmedabad | Law Garden | 332 | 6 | 0.35 | — | 80% | 2.00 | 1.3 | 67 |
| 179 | Ahmedabad | Ellisbridge | 336 | 6 | 0.36 | — | 80% | 2.00 | 1.3 | 66 |
| 180 | Ahmedabad | Paldi | 340 | 6 | 0.38 | rain | 40% | 2.00 | 2.5 | 55 |
| 181 | Ahmedabad | Ashram Road | 344 | 6 | 0.39 | — | 60% | 2.20 | 1.3 | 67 |
| 182 | Ahmedabad | Vastrapur | 348 | 6 | 0.40 | night | 60% | 2.20 | 1.3 | 61 |
| 183 | Ahmedabad | Bodakdev | 352 | 7 | 0.41 | — | 20% | 2.80 | 1.0 | 69 |
| 184 | Ahmedabad | Satellite | 356 | 7 | 0.42 | — | 20% | 2.80 | 1.0 | 67 |
| 185 | Ahmedabad | Prahlad Nagar | 360 | 7 | 0.43 | rain | 40% | 2.40 | 1.5 | 67 |
| 186 | Ahmedabad | SG Highway | 364 | 7 | 0.44 | — | 20% | 2.80 | 1.0 | 66 |
| 187 | Ahmedabad | Thaltej | 368 | 7 | 0.45 | — | 40% | 2.60 | 1.0 | 64 |
| 188 | Ahmedabad | Bopal | 372 | 8 | 0.47 | — | 20% | 2.80 | 1.0 | 78 |
| 189 | Ahmedabad | Vejalpur | 376 | 8 | 0.48 | night | 0% | 3.00 | — | — |
| 190 | Ahmedabad | Naranpura | 380 | 8 | 0.49 | rain | 20% | 2.60 | 2.0 | 65 |
| 191 | Ahmedabad | Ghatlodia | 384 | 8 | 0.50 | — | 20% | 2.80 | 1.0 | 72 |
| 192 | Ahmedabad | Gota | 388 | 8 | 0.51 | — | 20% | 2.80 | 1.0 | 72 |
| 193 | Ahmedabad | Chandkheda | 392 | 9 | 0.52 | — | 0% | 3.00 | — | — |
| 194 | Ahmedabad | Shahibaug | 396 | 9 | 0.53 | — | 20% | 2.80 | 1.0 | 83 |
| 195 | Ahmedabad | Kalupur | 400 | 9 | 0.54 | rain | 20% | 2.80 | 1.0 | 82 |
| 196 | Ahmedabad | Naroda | 404 | 9 | 0.56 | night | 40% | 2.40 | 1.5 | 77 |
| 197 | Ahmedabad | Nikol | 408 | 9 | 0.57 | — | 40% | 2.00 | 2.5 | 79 |
| 198 | Ahmedabad | Vastral | 412 | 10 | 0.58 | — | 40% | 2.00 | 2.5 | 82 |
| 199 | Ahmedabad | Maninagar | 416 | 10 | 0.59 | — | 20% | 2.40 | 3.0 | 88 |
| 200 | Ahmedabad | Manek Chowk | 420 | 10 | 0.60 | rain, night | 60% | 2.00 | 1.7 | 74 |
