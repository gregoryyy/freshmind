# Hybrid comparison: complete condition tables

Means [min, max] across all five starts, not confidence intervals. Physical lens twins are counted once. Angular errors are radians. Each full/view pair uses the same retained constraint set; subsets differ between rules.

| Focus | Rule | Nodes / relations | Aggregated | Filtered nodes / relations | Focal links retained | Focal members retained | Angular degrees, source → view |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| star | Full | 13 / 13 | 0 | 0 / 0 | 3/3 | 4/4 | project-a: 3 → project-a: 3 |
| star | Aggregate | 6 / 6 | 7 | 0 / 0 | 3/3 | 4/4 | project-a: 3 → project-a: 3 |
| star | Hide person | 8 / 7 | 0 | 5 / 6 | 3/3 | 4/4 | project-a: 3 → project-a: 3 |
| star | Hide authored | 13 / 9 | 0 | 0 / 4 | 2/3 | 3/4 | project-a: 3 → project-a: 2 |
| stored-tree | Full | 13 / 13 | 0 | 0 / 0 | 5/5 | 6/6 | project-a: 2, alpha: 4 → project-a: 2, alpha: 4 |
| stored-tree | Aggregate | 9 / 9 | 4 | 0 / 0 | 5/5 | 6/6 | project-a: 2, alpha: 4 → project-a: 2, alpha: 4 |
| stored-tree | Hide person | 8 / 7 | 0 | 5 / 6 | 3/5 | 4/6 | project-a: 2, alpha: 4 → project-a: 2, alpha: 2 |
| stored-tree | Hide authored | 13 / 9 | 0 | 0 / 4 | 3/5 | 4/6 | project-a: 2, alpha: 4 → alpha: 3 |

| Focus | Rule | Force | Common full radial RMS | View radial RMS | Common full angular RMS | View angular RMS | Large steps | Final force / rigidity |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| star | Full | TG | 61.342 [60.803, 61.889] | 61.342 [60.803, 61.889] | 0.026 [0.021, 0.033] | 0.026 [0.021, 0.033] | 0.000 [0.000, 0.000] | 0.133 [0.114, 0.144] |
| star | Full | RFC | 3.635 [3.634, 3.639] | 3.635 [3.634, 3.639] | 0.004 [0.004, 0.004] | 0.004 [0.004, 0.004] | 1.600 [0.000, 2.000] | 0.059 [0.056, 0.060] |
| star | Aggregate | TG | 61.342 [60.803, 61.889] | 16.299 [16.296, 16.303] | 0.026 [0.021, 0.033] | 0.495 [0.495, 0.495] | 0.000 [0.000, 0.000] | 0.003 [0.003, 0.003] |
| star | Aggregate | RFC | 3.635 [3.634, 3.639] | 0.541 [0.541, 0.541] | 0.004 [0.004, 0.004] | 0.004 [0.004, 0.004] | 1.600 [0.000, 2.000] | 0.004 [0.004, 0.004] |
| star | Hide person | TG | 61.342 [60.803, 61.889] | 44.763 [44.628, 44.911] | 0.026 [0.021, 0.033] | 0.409 [0.400, 0.416] | 0.000 [0.000, 0.000] | 0.034 [0.028, 0.040] |
| star | Hide person | RFC | 3.635 [3.634, 3.639] | 2.190 [2.190, 2.190] | 0.004 [0.004, 0.004] | 0.005 [0.005, 0.005] | 1.600 [0.000, 2.000] | 0.003 [0.003, 0.003] |
| star | Hide authored | TG | 71.112 [70.556, 71.671] | 28.614 [28.199, 29.246] | 1.073 [1.067, 1.077] | 1.068 [1.042, 1.101] | 0.000 [0.000, 0.000] | 0.750 [0.735, 0.768] |
| star | Hide authored | RFC | 4.295 [4.294, 4.300] | 0.840 [0.820, 0.873] | 1.041 [1.041, 1.041] | 0.006 [0.006, 0.006] | 3.000 [3.000, 3.000] | 0.753 [0.742, 0.773] |
| stored-tree | Full | TG | 44.251 [43.947, 44.554] | 44.251 [43.947, 44.554] | 0.894 [0.890, 0.901] | 0.894 [0.890, 0.901] | 0.000 [0.000, 0.000] | 0.133 [0.114, 0.144] |
| stored-tree | Full | RFC | 2.107 [2.107, 2.107] | 2.107 [2.107, 2.107] | 0.013 [0.013, 0.013] | 0.013 [0.013, 0.013] | 0.200 [0.000, 1.000] | 0.003 [0.002, 0.003] |
| stored-tree | Aggregate | TG | 44.251 [43.947, 44.554] | 41.063 [41.061, 41.064] | 0.894 [0.890, 0.901] | 0.665 [0.665, 0.665] | 0.000 [0.000, 0.000] | 0.002 [0.002, 0.002] |
| stored-tree | Aggregate | RFC | 2.107 [2.107, 2.107] | 1.938 [1.938, 1.938] | 0.013 [0.013, 0.013] | 0.011 [0.011, 0.011] | 0.200 [0.000, 1.000] | 0.003 [0.003, 0.003] |
| stored-tree | Hide person | TG | 50.403 [49.964, 50.880] | 26.668 [26.563, 26.810] | 1.237 [1.228, 1.255] | 1.119 [1.114, 1.126] | 0.000 [0.000, 0.000] | 0.034 [0.028, 0.040] |
| stored-tree | Hide person | RFC | 2.507 [2.507, 2.507] | 1.001 [0.991, 1.008] | 1.113 [1.113, 1.113] | 0.007 [0.007, 0.007] | 2.800 [2.000, 3.000] | 0.045 [0.037, 0.052] |
| stored-tree | Hide authored | TG | 50.264 [49.909, 50.524] | 25.688 [24.991, 26.667] | 0.908 [0.902, 0.911] | 0.750 [0.740, 0.770] | 0.000 [0.000, 0.000] | 0.750 [0.735, 0.768] |
| stored-tree | Hide authored | RFC | 2.584 [2.584, 2.584] | 0.888 [0.866, 0.940] | 0.729 [0.729, 0.729] | 0.006 [0.006, 0.006] | 0.000 [0.000, 0.000] | 0.663 [0.638, 0.673] |

| Focus | Rule | Force | Lens | Visible point pairs / disjoint edge pairs | Min displayed separation |
| --- | --- | --- | ---: | ---: | ---: |
| star | Full | TG | 0 | 78 / 51 | 121.656 [121.353, 122.263] |
| star | Full | TG | 60 | 78 / 51 | 95.151 [94.826, 95.380] |
| star | Full | RFC | 0 | 78 / 51 | 119.784 [119.680, 119.870] |
| star | Full | RFC | 60 | 78 / 51 | 100.284 [100.259, 100.307] |
| star | Aggregate | TG | 0 | 15 / 8 | 120.145 [120.141, 120.151] |
| star | Aggregate | TG | 60 | 15 / 8 | 118.233 [118.227, 118.240] |
| star | Aggregate | RFC | 0 | 15 / 8 | 120.465 [120.465, 120.465] |
| star | Aggregate | RFC | 60 | 15 / 8 | 134.559 [134.559, 134.559] |
| star | Hide person | TG | 0 | 28 / 13 | 130.934 [130.798, 131.074] |
| star | Hide person | TG | 60 | 28 / 13 | 86.172 [86.050, 86.339] |
| star | Hide person | RFC | 0 | 28 / 13 | 120.769 [120.768, 120.769] |
| star | Hide person | RFC | 60 | 28 / 13 | 89.893 [89.890, 89.895] |
| star | Hide authored | TG | 0 | 78 / 21 | 135.991 [135.378, 136.691] |
| star | Hide authored | TG | 60 | 78 / 21 | 100.160 [99.245, 100.889] |
| star | Hide authored | RFC | 0 | 78 / 21 | 109.078 [108.615, 109.693] |
| star | Hide authored | RFC | 60 | 78 / 21 | 102.765 [101.868, 103.392] |
| stored-tree | Full | TG | 0 | 78 / 51 | 121.656 [121.353, 122.263] |
| stored-tree | Full | TG | 60 | 78 / 51 | 95.151 [94.826, 95.380] |
| stored-tree | Full | RFC | 0 | 78 / 51 | 108.239 [108.164, 108.265] |
| stored-tree | Full | RFC | 60 | 78 / 51 | 97.926 [97.924, 97.927] |
| stored-tree | Aggregate | TG | 0 | 36 / 20 | 124.146 [124.145, 124.148] |
| stored-tree | Aggregate | TG | 60 | 36 / 20 | 114.449 [114.449, 114.450] |
| stored-tree | Aggregate | RFC | 0 | 36 / 20 | 91.861 [91.858, 91.863] |
| stored-tree | Aggregate | RFC | 60 | 36 / 20 | 99.176 [99.176, 99.176] |
| stored-tree | Hide person | TG | 0 | 28 / 13 | 130.934 [130.798, 131.074] |
| stored-tree | Hide person | TG | 60 | 28 / 13 | 86.172 [86.050, 86.339] |
| stored-tree | Hide person | RFC | 0 | 28 / 13 | 119.825 [119.798, 119.854] |
| stored-tree | Hide person | RFC | 60 | 28 / 13 | 85.666 [85.587, 85.779] |
| stored-tree | Hide authored | TG | 0 | 78 / 21 | 135.991 [135.378, 136.691] |
| stored-tree | Hide authored | TG | 60 | 78 / 21 | 100.160 [99.245, 100.889] |
| stored-tree | Hide authored | RFC | 0 | 78 / 21 | 120.351 [120.328, 120.391] |
| stored-tree | Hide authored | RFC | 60 | 78 / 21 | 100.551 [99.934, 101.093] |
