FILEPATH="~/results/charts/memory-series.png"

set term png size 1600,1000
set output FILEPATH
set datafile separator ','
set title "Memory usage in time" font "Arial,20"
set xlabel "Time" font ",20"
set ylabel "Memory usage (MiB)" font ",20"
set tmargin 5
set lmargin 12
set bmargin 5
set key box vertical width 1 height 1 maxcols 1 spacing 2

set style line 1 lt 1 lw 3 lc rgb "#3b518b" # blue
set style line 2 lt 1 lw 3 lc rgb "#27ad81" # green

FILE1="~/results/benchmarks/baseline/memory-time-series.csv"
FILE2="~/results/benchmarks/compare/memory-time-series.csv"

if (exists("INCLUDE_COMPARE")) {
    print "Including baseline and compare in plot"

    plot FILE1 using 1:2 smooth csplines linestyle 1 title "baseline" with lines,\
         FILE2 using 1:2 smooth csplines linestyle 2 title "new" with lines
} else {
    plot FILE1 using 1:2 smooth csplines linestyle 1 title "baseline" with lines
    print "Including only baseline in plot"
}

print "Chart saved in '".FILEPATH."'"
