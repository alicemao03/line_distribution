export function renderPieChart(svg, svt_line_timing, width, height, color) {

    const memberNames = svt_line_timing.map(item => item.member)
    console.log("NAMES:", memberNames)

    svg.attr("viewBox", [-width / 2, -height / 2, width, height])

    console.log("asdfasf", svt_line_timing)

    const radius = Math.min(width, height) / 2;

    const pie = d3.pie()
        .value(d => d.seconds)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0) // Set to > 0 for a Donut Chart
        .outerRadius(radius - 1);

    const labelArc = d3.arc()
        .innerRadius(radius * 0.7) // 70% of the way out
        .outerRadius(radius * 0.7)

    const paths = svg.append("g")
        .selectAll()
        .data(pie(svt_line_timing))
        .join("path")
        .attr("fill", d => color(d.data.member))
        .attr("d", arc)
        .attr("class", "chart-fragment")

    svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 16)
        .attr("text-anchor", "middle")
        .selectAll()
        .data(pie(svt_line_timing))
        .join("text")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .call(text => text.append("tspan")
            .attr("font-weight", "bold")
            .text(d => d.data.member))
        .call(text => text.append("tspan")
            .attr("x", 0)
            .attr("y", "1.4em")
            .text(d => `${d.data.seconds.toFixed(1)}s`))

    return paths
}