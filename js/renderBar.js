export function renderBar(svg, svt_line_timing, width, height, margin, color) {
    // Determine the series that need to be stacked.

    const memberNames = svt_line_timing.map(item => item.member)
    console.log("NAMES:", svt_line_timing)

    svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)

    const mainGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + 20}, ${margin.top})`)

    var x = d3.scaleBand()
        .range([0, width])
        .domain(memberNames)
        .padding(0.2);

    mainGroup.append("g")
        .attr("transform", "translate(0," + (height - 50) + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style('fill', 'white')
        .attr("font-size", 14)

    var y = d3.scaleLinear()
        .domain([0, d3.max(svt_line_timing, d => d.seconds)])
        .range([height - 50, 0]);

    const yAxisGroup = mainGroup.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y)
            .ticks(10)
            .tickFormat(d => d + "%")
        );

    yAxisGroup.selectAll("text")
        .style("fill", "white")
        .style("font-size", "16px")

    yAxisGroup.selectAll("path")
        .style("stroke", "black")
    yAxisGroup.selectAll("line")
        .style("stroke", "black")


    const paths = mainGroup.selectAll()
        .data(svt_line_timing)
        .enter()
        .append("rect")
        .attr("class", "chart-fragment")
        .attr("x", function (d) { return x(d.member); })
        .attr("y", function (d) { return y(d.seconds); })
        .attr("width", x.bandwidth())
        .attr("height", function (d) { return height - 50 - y(d.seconds); })
        .attr("fill", d => color(d.member))

    return paths
}