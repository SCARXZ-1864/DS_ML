# Data card · review dataset

Built by `pipeline/notebooks/01_data.ipynb` with seed 42.

## Sources and licences
- **Restaurant:** Yelp Open Dataset via Kaggle (`yelp-dataset/yelp-dataset`), businesses in the *Restaurants* category. Academic/non-commercial use only; review text is never republished.
- **Grocery / Appliances:** Amazon Reviews 2023 (`McAuley-Lab/Amazon-Reviews-2023`), categories Grocery_and_Gourmet_Food, Appliances. Research use; not redistributed.

## Labels
Stars → label: 1–2 negative, 3 neutral, 4–5 positive. Stars and text sometimes disagree (§7 of the notebook).

## Cleaning (per domain)
|            |   sampled |   short |   non_english |   duplicate |   kept |
|:-----------|----------:|--------:|--------------:|------------:|-------:|
| restaurant |     65000 |       2 |            43 |           3 |  50000 |
| grocery    |     65000 |    2448 |           326 |         628 |  50000 |
| appliances |     65000 |    2441 |           516 |        1329 |  50000 |

## Label balance (% of reviews)
| domain     |   negative |   neutral |   positive |
|:-----------|-----------:|----------:|-----------:|
| appliances |       16.1 |       5.1 |       78.8 |
| grocery    |       18.3 |       6.5 |       75.2 |
| restaurant |       20.5 |      11.5 |       68   |

## Splits (reviews; whole shops per split, grouped by product or business)
| domain     |   train |   val |   test |
|:-----------|--------:|------:|-------:|
| appliances |   39976 |  5028 |   4996 |
| grocery    |   40000 |  5000 |   5000 |
| restaurant |   40000 |  5000 |   5000 |
| total      |  119976 | 15028 |  14996 |

Date range: 2003-03-04 to 2023-09-07. Rows: 150,000.
