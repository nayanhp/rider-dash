# Rider Dash balance

Headless check of all 200 generated levels. A deterministic bot (`src/sim/bot.ts`) rides each one on seeds 1, 2, 3, 4, 5. It looks about a second ahead, changes lane once per decision, jumps potholes and speed breakers, and picks up parcels when that lane is clear. Commands wait 8 ticks, so it is not perfect. It does not revive. A level counts as cleared only on a win. Runs are capped at 150 seconds.

Overall clear rate across seeds: **59%**. Level 1 is 100%. The last area is 20%.

The difficulty number is `cityIndex * cityStep + areaFraction * areaSpan`, capped at 1. `cityStep` is 0.057143 and `areaSpan` is 0.6, so the cap lands on the last area of Ahmedabad. It used to be 0.08, which pinned Lake Town through New Town in Kolkata, and Shahibaug through Manek Chowk in Ahmedabad, to the same maximum speed, goal, and density.

## By city

| City | Areas | Clear rate | Avg hits | Speed | Goal | Density |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Bengaluru | 25 | 86% | 1.19 | 260 → 356 | 2 → 7 | 0.15 → 0.42 |
| Mumbai | 25 | 81% | 1.34 | 269 → 365 | 2 → 7 | 0.18 → 0.45 |
| Delhi | 25 | 66% | 1.68 | 278 → 374 | 3 → 8 | 0.20 → 0.47 |
| Hyderabad | 25 | 63% | 1.79 | 287 → 383 | 3 → 8 | 0.23 → 0.50 |
| Chennai | 25 | 58% | 1.98 | 297 → 393 | 4 → 9 | 0.25 → 0.52 |
| Pune | 25 | 45% | 2.22 | 306 → 402 | 4 → 9 | 0.28 → 0.55 |
| Kolkata | 25 | 38% | 2.35 | 315 → 411 | 5 → 10 | 0.30 → 0.57 |
| Ahmedabad | 25 | 34% | 2.46 | 324 → 420 | 5 → 10 | 0.33 → 0.60 |

Clear rate is how often the bot won. Hits include crashes on runs it lost. Hearts and seconds are averaged over wins only. A new city starts easier than the one before it ended; that drop is the curve, not a spike.

## Outliers

- No tuning plateau. No three areas in a row share speed, goal, and density.
- No hard spike. No area inside a city clears at least 60 points below both neighbours.

## Levels

| # | City | Area | Speed | Goal | Density | Weather | Clear | Hits | Hearts | Seconds |
| ---: | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Bengaluru | Koramangala | 260 | 2 | 0.15 | — | 100% | 0.40 | 2.6 | 31 |
| 2 | Bengaluru | Indiranagar | 264 | 2 | 0.16 | — | 100% | 0.40 | 2.6 | 30 |
| 3 | Bengaluru | HSR Layout | 268 | 2 | 0.17 | — | 100% | 0.60 | 2.4 | 28 |
| 4 | Bengaluru | Jayanagar | 272 | 3 | 0.18 | — | 100% | 0.60 | 2.4 | 29 |
| 5 | Bengaluru | BTM Layout | 276 | 3 | 0.19 | rain | 100% | 0.60 | 2.4 | 29 |
| 6 | Bengaluru | Malleshwaram | 280 | 3 | 0.21 | — | 100% | 0.60 | 2.4 | 29 |
| 7 | Bengaluru | Basavanagudi | 284 | 3 | 0.22 | night | 100% | 0.80 | 2.2 | 28 |
| 8 | Bengaluru | JP Nagar | 288 | 3 | 0.23 | — | 100% | 0.60 | 2.4 | 28 |
| 9 | Bengaluru | MG Road | 292 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 46 |
| 10 | Bengaluru | Ulsoor | 296 | 4 | 0.25 | rain | 100% | 0.80 | 2.2 | 46 |
| 11 | Bengaluru | Frazer Town | 300 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 45 |
| 12 | Bengaluru | Rajajinagar | 304 | 4 | 0.27 | — | 100% | 0.80 | 2.2 | 45 |
| 13 | Bengaluru | Banashankari | 308 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 43 |
| 14 | Bengaluru | Vijayanagar | 312 | 5 | 0.30 | night | 100% | 1.00 | 2.0 | 41 |
| 15 | Bengaluru | Bellandur | 316 | 5 | 0.31 | rain | 100% | 1.20 | 1.8 | 42 |
| 16 | Bengaluru | Sarjapur Road | 320 | 5 | 0.32 | — | 80% | 1.40 | 2.0 | 40 |
| 17 | Bengaluru | Marathahalli | 324 | 5 | 0.33 | — | 60% | 1.80 | 2.0 | 40 |
| 18 | Bengaluru | Whitefield | 328 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 19 | Bengaluru | Bannerghatta Road | 332 | 6 | 0.35 | — | 60% | 2.40 | 1.0 | 48 |
| 20 | Bengaluru | Electronic City | 336 | 6 | 0.36 | rain | 80% | 1.80 | 1.5 | 45 |
| 21 | Bengaluru | Hebbal | 340 | 6 | 0.38 | night | 60% | 2.00 | 1.7 | 40 |
| 22 | Bengaluru | RT Nagar | 344 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 23 | Bengaluru | Hennur | 348 | 6 | 0.40 | — | 60% | 2.00 | 1.7 | 41 |
| 24 | Bengaluru | Yelahanka | 352 | 7 | 0.41 | — | 60% | 1.80 | 2.0 | 49 |
| 25 | Bengaluru | Sadashivanagar | 356 | 7 | 0.42 | rain, night | 60% | 1.60 | 2.3 | 46 |
| 26 | Mumbai | Bandra | 269 | 2 | 0.18 | — | 100% | 0.60 | 2.4 | 30 |
| 27 | Mumbai | Khar | 273 | 3 | 0.19 | — | 100% | 0.60 | 2.4 | 29 |
| 28 | Mumbai | Santacruz | 277 | 3 | 0.20 | rain | 100% | 0.60 | 2.4 | 29 |
| 29 | Mumbai | Juhu | 281 | 3 | 0.21 | — | 100% | 0.60 | 2.4 | 28 |
| 30 | Mumbai | Vile Parle | 285 | 3 | 0.22 | — | 100% | 0.80 | 2.2 | 28 |
| 31 | Mumbai | Andheri | 289 | 3 | 0.23 | rain | 100% | 0.60 | 2.4 | 28 |
| 32 | Mumbai | Versova | 293 | 4 | 0.24 | night | 100% | 0.80 | 2.2 | 46 |
| 33 | Mumbai | Goregaon | 297 | 4 | 0.25 | — | 100% | 0.80 | 2.2 | 46 |
| 34 | Mumbai | Malad | 301 | 4 | 0.27 | rain | 100% | 0.80 | 2.2 | 45 |
| 35 | Mumbai | Kandivali | 305 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 43 |
| 36 | Mumbai | Borivali | 309 | 4 | 0.29 | — | 100% | 1.00 | 2.0 | 42 |
| 37 | Mumbai | Powai | 313 | 5 | 0.30 | rain | 100% | 1.00 | 2.0 | 41 |
| 38 | Mumbai | Ghatkopar | 317 | 5 | 0.31 | — | 80% | 1.40 | 2.0 | 40 |
| 39 | Mumbai | Kurla | 321 | 5 | 0.32 | night | 80% | 1.40 | 2.0 | 40 |
| 40 | Mumbai | Chembur | 325 | 5 | 0.33 | rain | 100% | 1.00 | 2.0 | 41 |
| 41 | Mumbai | Sion | 329 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 42 | Mumbai | Wadala | 333 | 6 | 0.36 | — | 60% | 2.40 | 1.0 | 48 |
| 43 | Mumbai | Matunga | 337 | 6 | 0.37 | rain | 60% | 2.00 | 1.7 | 44 |
| 44 | Mumbai | Dadar | 341 | 6 | 0.38 | — | 40% | 2.60 | 1.0 | 48 |
| 45 | Mumbai | Worli | 345 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 46 | Mumbai | Lower Parel | 349 | 6 | 0.40 | rain, night | 80% | 1.40 | 2.0 | 38 |
| 47 | Mumbai | Byculla | 353 | 7 | 0.41 | — | 60% | 1.80 | 2.0 | 49 |
| 48 | Mumbai | Marine Lines | 357 | 7 | 0.42 | — | 60% | 1.80 | 2.0 | 49 |
| 49 | Mumbai | Mulund | 361 | 7 | 0.43 | rain | 60% | 1.60 | 2.3 | 45 |
| 50 | Mumbai | Colaba | 365 | 7 | 0.45 | night | 20% | 2.80 | 1.0 | 43 |
| 51 | Delhi | Connaught Place | 278 | 3 | 0.20 | — | 100% | 0.60 | 2.4 | 29 |
| 52 | Delhi | Karol Bagh | 282 | 3 | 0.21 | — | 100% | 0.60 | 2.4 | 28 |
| 53 | Delhi | Paharganj | 286 | 3 | 0.22 | — | 100% | 0.80 | 2.2 | 28 |
| 54 | Delhi | Rajouri Garden | 290 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 47 |
| 55 | Delhi | Janakpuri | 294 | 4 | 0.25 | rain | 100% | 0.80 | 2.2 | 46 |
| 56 | Delhi | Dwarka | 298 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 45 |
| 57 | Delhi | Lajpat Nagar | 302 | 4 | 0.27 | night | 100% | 0.80 | 2.2 | 45 |
| 58 | Delhi | Defence Colony | 306 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 43 |
| 59 | Delhi | Green Park | 310 | 5 | 0.29 | — | 100% | 1.00 | 2.0 | 41 |
| 60 | Delhi | Hauz Khas | 314 | 5 | 0.30 | rain | 100% | 1.00 | 2.0 | 41 |
| 61 | Delhi | Malviya Nagar | 318 | 5 | 0.31 | — | 60% | 1.60 | 2.3 | 37 |
| 62 | Delhi | Saket | 322 | 5 | 0.33 | — | 60% | 1.80 | 2.0 | 40 |
| 63 | Delhi | Sarojini Nagar | 326 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 64 | Delhi | Vasant Kunj | 330 | 6 | 0.35 | night | 60% | 2.20 | 1.3 | 49 |
| 65 | Delhi | Greater Kailash | 334 | 6 | 0.36 | rain | 80% | 1.40 | 2.0 | 39 |
| 66 | Delhi | Kalkaji | 338 | 6 | 0.37 | — | 40% | 2.60 | 1.0 | 48 |
| 67 | Delhi | Nehru Place | 342 | 6 | 0.38 | — | 40% | 2.60 | 1.0 | 48 |
| 68 | Delhi | Mayur Vihar | 346 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 69 | Delhi | Laxmi Nagar | 350 | 7 | 0.40 | — | 20% | 2.60 | 2.0 | 45 |
| 70 | Delhi | Shahdara | 354 | 7 | 0.42 | rain | 40% | 2.20 | 2.0 | 44 |
| 71 | Delhi | Model Town | 358 | 7 | 0.43 | night | 40% | 2.20 | 2.0 | 44 |
| 72 | Delhi | Pitampura | 362 | 7 | 0.44 | — | 40% | 2.40 | 1.5 | 43 |
| 73 | Delhi | Rohini | 366 | 7 | 0.45 | — | 20% | 2.80 | 1.0 | 43 |
| 74 | Delhi | Chanakyapuri | 370 | 8 | 0.46 | — | 0% | 3.00 | — | — |
| 75 | Delhi | Chandni Chowk | 374 | 8 | 0.47 | rain, night | 40% | 2.40 | 1.5 | 42 |
| 76 | Hyderabad | Ameerpet | 287 | 3 | 0.23 | — | 100% | 0.60 | 2.4 | 28 |
| 77 | Hyderabad | Begumpet | 291 | 4 | 0.24 | — | 100% | 0.80 | 2.2 | 46 |
| 78 | Hyderabad | Somajiguda | 295 | 4 | 0.25 | — | 100% | 0.80 | 2.2 | 46 |
| 79 | Hyderabad | Banjara Hills | 299 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 45 |
| 80 | Hyderabad | Jubilee Hills | 303 | 4 | 0.27 | rain | 100% | 0.80 | 2.2 | 45 |
| 81 | Hyderabad | Madhapur | 307 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 43 |
| 82 | Hyderabad | HITEC City | 311 | 5 | 0.29 | night | 100% | 1.00 | 2.0 | 41 |
| 83 | Hyderabad | Gachibowli | 315 | 5 | 0.31 | — | 100% | 1.20 | 1.8 | 42 |
| 84 | Hyderabad | Kondapur | 319 | 5 | 0.32 | — | 80% | 1.40 | 2.0 | 40 |
| 85 | Hyderabad | Manikonda | 323 | 5 | 0.33 | rain | 100% | 1.00 | 2.0 | 41 |
| 86 | Hyderabad | Tolichowki | 327 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 87 | Hyderabad | Mehdipatnam | 331 | 6 | 0.35 | — | 40% | 2.60 | 1.0 | 49 |
| 88 | Hyderabad | Kukatpally | 335 | 6 | 0.36 | — | 60% | 2.40 | 1.0 | 48 |
| 89 | Hyderabad | Miyapur | 339 | 6 | 0.37 | night | 60% | 2.40 | 1.0 | 47 |
| 90 | Hyderabad | Kompally | 343 | 6 | 0.38 | rain | 80% | 1.80 | 1.5 | 44 |
| 91 | Hyderabad | Secunderabad | 347 | 6 | 0.40 | — | 60% | 2.00 | 1.7 | 39 |
| 92 | Hyderabad | Tarnaka | 351 | 7 | 0.41 | — | 40% | 2.20 | 2.0 | 44 |
| 93 | Hyderabad | Uppal | 355 | 7 | 0.42 | — | 60% | 1.80 | 2.0 | 49 |
| 94 | Hyderabad | Himayatnagar | 359 | 7 | 0.43 | — | 60% | 1.80 | 2.0 | 48 |
| 95 | Hyderabad | Abids | 363 | 7 | 0.44 | rain | 40% | 2.20 | 2.0 | 43 |
| 96 | Hyderabad | Nampally | 367 | 7 | 0.45 | night | 20% | 2.80 | 1.0 | 43 |
| 97 | Hyderabad | Malakpet | 371 | 8 | 0.46 | — | 0% | 3.00 | — | — |
| 98 | Hyderabad | Dilsukhnagar | 375 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 99 | Hyderabad | LB Nagar | 379 | 8 | 0.49 | — | 0% | 3.00 | — | — |
| 100 | Hyderabad | Charminar | 383 | 8 | 0.50 | rain, night | 20% | 2.80 | 1.0 | 41 |
| 101 | Chennai | T. Nagar | 297 | 4 | 0.25 | — | 100% | 0.80 | 2.2 | 46 |
| 102 | Chennai | Mylapore | 301 | 4 | 0.26 | — | 100% | 0.80 | 2.2 | 45 |
| 103 | Chennai | Alwarpet | 305 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 43 |
| 104 | Chennai | Nungambakkam | 309 | 4 | 0.29 | — | 100% | 1.00 | 2.0 | 42 |
| 105 | Chennai | Egmore | 313 | 5 | 0.30 | rain | 100% | 1.00 | 2.0 | 41 |
| 106 | Chennai | Kilpauk | 317 | 5 | 0.31 | — | 100% | 1.20 | 1.8 | 42 |
| 107 | Chennai | Anna Nagar | 321 | 5 | 0.32 | night | 80% | 1.40 | 2.0 | 40 |
| 108 | Chennai | Ashok Nagar | 325 | 5 | 0.33 | — | 60% | 1.80 | 2.0 | 40 |
| 109 | Chennai | KK Nagar | 329 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 110 | Chennai | Vadapalani | 333 | 6 | 0.35 | rain | 80% | 1.80 | 1.5 | 45 |
| 111 | Chennai | Kodambakkam | 337 | 6 | 0.37 | — | 60% | 2.40 | 1.0 | 48 |
| 112 | Chennai | Saidapet | 341 | 6 | 0.38 | — | 60% | 2.40 | 1.0 | 47 |
| 113 | Chennai | Guindy | 345 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 114 | Chennai | Velachery | 349 | 6 | 0.40 | night | 60% | 2.00 | 1.7 | 39 |
| 115 | Chennai | Adyar | 353 | 7 | 0.41 | rain | 40% | 2.20 | 2.0 | 44 |
| 116 | Chennai | Besant Nagar | 357 | 7 | 0.42 | — | 60% | 1.80 | 2.0 | 49 |
| 117 | Chennai | Thiruvanmiyur | 361 | 7 | 0.43 | — | 60% | 2.00 | 1.7 | 45 |
| 118 | Chennai | Perungudi | 365 | 7 | 0.44 | — | 60% | 2.00 | 1.7 | 45 |
| 119 | Chennai | Sholinganallur | 369 | 7 | 0.46 | — | 40% | 2.60 | 1.0 | 43 |
| 120 | Chennai | Porur | 373 | 8 | 0.47 | rain | 40% | 2.40 | 1.5 | 42 |
| 121 | Chennai | Chromepet | 377 | 8 | 0.48 | night | 0% | 3.00 | — | — |
| 122 | Chennai | Tambaram | 381 | 8 | 0.49 | — | 0% | 3.00 | — | — |
| 123 | Chennai | Perambur | 385 | 8 | 0.50 | — | 0% | 3.00 | — | — |
| 124 | Chennai | Royapettah | 389 | 8 | 0.51 | — | 20% | 2.80 | 1.0 | 45 |
| 125 | Chennai | Triplicane | 393 | 9 | 0.52 | rain, night | 0% | 3.00 | — | — |
| 126 | Pune | Shivajinagar | 306 | 4 | 0.28 | — | 100% | 0.80 | 2.2 | 43 |
| 127 | Pune | Deccan | 310 | 4 | 0.29 | — | 100% | 1.00 | 2.0 | 42 |
| 128 | Pune | Sadashiv Peth | 314 | 5 | 0.30 | — | 100% | 1.00 | 2.0 | 41 |
| 129 | Pune | Erandwane | 318 | 5 | 0.31 | — | 60% | 1.60 | 2.3 | 37 |
| 130 | Pune | Kothrud | 322 | 5 | 0.32 | rain | 100% | 1.20 | 1.8 | 41 |
| 131 | Pune | Karve Nagar | 326 | 5 | 0.33 | — | 60% | 1.80 | 2.0 | 40 |
| 132 | Pune | Camp | 330 | 5 | 0.35 | night | 60% | 1.80 | 2.0 | 42 |
| 133 | Pune | Koregaon Park | 334 | 6 | 0.36 | — | 60% | 2.40 | 1.0 | 48 |
| 134 | Pune | Kalyani Nagar | 338 | 6 | 0.37 | — | 40% | 2.60 | 1.0 | 48 |
| 135 | Pune | Viman Nagar | 342 | 6 | 0.38 | rain | 80% | 1.40 | 2.0 | 39 |
| 136 | Pune | Yerawada | 346 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 137 | Pune | Kharadi | 350 | 6 | 0.40 | — | 60% | 2.00 | 1.7 | 39 |
| 138 | Pune | Hadapsar | 354 | 7 | 0.41 | — | 40% | 2.20 | 2.0 | 44 |
| 139 | Pune | Magarpatta | 358 | 7 | 0.42 | night | 40% | 2.20 | 2.0 | 44 |
| 140 | Pune | Wanowrie | 362 | 7 | 0.44 | rain | 40% | 2.20 | 2.0 | 43 |
| 141 | Pune | Kondhwa | 366 | 7 | 0.45 | — | 20% | 2.80 | 1.0 | 43 |
| 142 | Pune | Swargate | 370 | 7 | 0.46 | — | 40% | 2.60 | 1.0 | 43 |
| 143 | Pune | Sinhagad Road | 374 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 144 | Pune | Aundh | 378 | 8 | 0.48 | — | 0% | 3.00 | — | — |
| 145 | Pune | Baner | 382 | 8 | 0.49 | rain | 20% | 2.80 | 1.0 | 41 |
| 146 | Pune | Pashan | 386 | 8 | 0.50 | night | 40% | 2.60 | 1.0 | 41 |
| 147 | Pune | Bavdhan | 390 | 8 | 0.51 | — | 0% | 3.00 | — | — |
| 148 | Pune | Wakad | 394 | 9 | 0.53 | — | 0% | 3.00 | — | — |
| 149 | Pune | Pimple Saudagar | 398 | 9 | 0.54 | — | 0% | 3.00 | — | — |
| 150 | Pune | Hinjewadi | 402 | 9 | 0.55 | rain, night | 0% | 3.00 | — | — |
| 151 | Kolkata | Park Street | 315 | 5 | 0.30 | — | 100% | 1.00 | 2.0 | 41 |
| 152 | Kolkata | Chowringhee | 319 | 5 | 0.32 | — | 80% | 1.40 | 2.0 | 40 |
| 153 | Kolkata | Esplanade | 323 | 5 | 0.33 | — | 60% | 1.80 | 2.0 | 40 |
| 154 | Kolkata | Elgin Road | 327 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 155 | Kolkata | Bhowanipore | 331 | 6 | 0.35 | rain | 100% | 1.00 | 2.0 | 41 |
| 156 | Kolkata | Kalighat | 335 | 6 | 0.36 | — | 80% | 1.80 | 1.5 | 42 |
| 157 | Kolkata | Alipore | 339 | 6 | 0.37 | night | 40% | 2.60 | 1.0 | 48 |
| 158 | Kolkata | Ballygunge | 343 | 6 | 0.38 | — | 60% | 2.40 | 1.0 | 47 |
| 159 | Kolkata | Gariahat | 347 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 160 | Kolkata | Kasba | 351 | 7 | 0.41 | rain | 40% | 2.20 | 2.0 | 45 |
| 161 | Kolkata | Jadavpur | 355 | 7 | 0.42 | — | 60% | 1.60 | 2.3 | 46 |
| 162 | Kolkata | Tollygunge | 359 | 7 | 0.43 | — | 60% | 1.80 | 2.0 | 48 |
| 163 | Kolkata | Behala | 363 | 7 | 0.44 | — | 60% | 2.00 | 1.7 | 45 |
| 164 | Kolkata | Garia | 367 | 7 | 0.45 | night | 20% | 2.80 | 1.0 | 43 |
| 165 | Kolkata | Entally | 371 | 8 | 0.46 | rain | 20% | 2.60 | 2.0 | 43 |
| 166 | Kolkata | Sealdah | 375 | 8 | 0.47 | — | 0% | 3.00 | — | — |
| 167 | Kolkata | College Street | 379 | 8 | 0.48 | — | 0% | 3.00 | — | — |
| 168 | Kolkata | Burrabazar | 383 | 8 | 0.50 | — | 20% | 2.80 | 1.0 | 41 |
| 169 | Kolkata | Bagbazar | 387 | 8 | 0.51 | — | 20% | 2.80 | 1.0 | 41 |
| 170 | Kolkata | Shyambazar | 391 | 9 | 0.52 | rain | 0% | 3.00 | — | — |
| 171 | Kolkata | Dum Dum | 395 | 9 | 0.53 | night | 0% | 3.00 | — | — |
| 172 | Kolkata | Lake Town | 399 | 9 | 0.54 | — | 0% | 3.00 | — | — |
| 173 | Kolkata | Salt Lake | 403 | 9 | 0.55 | — | 0% | 3.00 | — | — |
| 174 | Kolkata | Rajarhat | 407 | 9 | 0.56 | — | 0% | 3.00 | — | — |
| 175 | Kolkata | New Town | 411 | 10 | 0.57 | rain, night | 0% | 3.00 | — | — |
| 176 | Ahmedabad | Navrangpura | 324 | 5 | 0.33 | — | 60% | 1.80 | 2.0 | 40 |
| 177 | Ahmedabad | CG Road | 328 | 5 | 0.34 | — | 60% | 1.80 | 2.0 | 40 |
| 178 | Ahmedabad | Law Garden | 332 | 6 | 0.35 | — | 60% | 2.40 | 1.0 | 48 |
| 179 | Ahmedabad | Ellisbridge | 336 | 6 | 0.36 | — | 60% | 2.40 | 1.0 | 48 |
| 180 | Ahmedabad | Paldi | 340 | 6 | 0.38 | rain | 80% | 1.40 | 2.0 | 39 |
| 181 | Ahmedabad | Ashram Road | 344 | 6 | 0.39 | — | 60% | 2.40 | 1.0 | 45 |
| 182 | Ahmedabad | Vastrapur | 348 | 6 | 0.40 | night | 60% | 2.00 | 1.7 | 41 |
| 183 | Ahmedabad | Bodakdev | 352 | 7 | 0.41 | — | 60% | 1.80 | 2.0 | 49 |
| 184 | Ahmedabad | Satellite | 356 | 7 | 0.42 | — | 60% | 1.80 | 2.0 | 46 |
| 185 | Ahmedabad | Prahlad Nagar | 360 | 7 | 0.43 | rain | 60% | 1.60 | 2.3 | 45 |
| 186 | Ahmedabad | SG Highway | 364 | 7 | 0.44 | — | 60% | 2.00 | 1.7 | 45 |
| 187 | Ahmedabad | Thaltej | 368 | 7 | 0.45 | — | 40% | 2.60 | 1.0 | 43 |
| 188 | Ahmedabad | Bopal | 372 | 8 | 0.47 | — | 20% | 2.80 | 1.0 | 42 |
| 189 | Ahmedabad | Vejalpur | 376 | 8 | 0.48 | night | 0% | 3.00 | — | — |
| 190 | Ahmedabad | Naranpura | 380 | 8 | 0.49 | rain | 20% | 2.80 | 1.0 | 42 |
| 191 | Ahmedabad | Ghatlodia | 384 | 8 | 0.50 | — | 0% | 3.00 | — | — |
| 192 | Ahmedabad | Gota | 388 | 8 | 0.51 | — | 0% | 3.00 | — | — |
| 193 | Ahmedabad | Chandkheda | 392 | 9 | 0.52 | — | 0% | 3.00 | — | — |
| 194 | Ahmedabad | Shahibaug | 396 | 9 | 0.53 | — | 20% | 2.60 | 2.0 | 49 |
| 195 | Ahmedabad | Kalupur | 400 | 9 | 0.54 | rain | 0% | 3.00 | — | — |
| 196 | Ahmedabad | Naroda | 404 | 9 | 0.56 | night | 0% | 3.00 | — | — |
| 197 | Ahmedabad | Nikol | 408 | 9 | 0.57 | — | 0% | 3.00 | — | — |
| 198 | Ahmedabad | Vastral | 412 | 10 | 0.58 | — | 20% | 2.80 | 1.0 | 59 |
| 199 | Ahmedabad | Maninagar | 416 | 10 | 0.59 | — | 20% | 2.80 | 1.0 | 54 |
| 200 | Ahmedabad | Manek Chowk | 420 | 10 | 0.60 | rain, night | 20% | 2.80 | 1.0 | 54 |
