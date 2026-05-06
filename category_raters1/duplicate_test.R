library(tidyverse)

d_category <- map_dfr(1:22, ~read_csv(paste0("trial_lists/file", .x, ".csv")))

d_category |>
  count(category_response) |>
  filter(n > 1)