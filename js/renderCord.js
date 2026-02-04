// export function renderCord(members, data, svg, color, onLyricClick) {
export function renderCord(members, data, svg, color, width, height, margin) {
    // Determine the series that need to be stacked.

    // svg.attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)

    const mainGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`)


    console.log('render cord', members, data)

    const matrix = Array.from({ length: members.length }, () => Array(members.length).fill(0));

    for (let i = 0; i < data.length - 1; i++) {
        const currentLine = data[i];
        const nextLine = data[i + 1];

        // Skip adlibs
        const currentMembers = currentLine.member.filter(m => m.toLowerCase() !== "adlib" || m.toLowerCase() !== "all");
        const nextMembers = nextLine.member.filter(m => m.toLowerCase() !== "adlib" || m.toLowerCase() !== "all");

        currentMembers.forEach(src => {
            const srcIndex = members.indexOf(src.trim());

            if (srcIndex === -1) return;
            //   console.log(src, srcIndex)
            nextMembers.forEach(tgt => {
                const tgtIndex = members.indexOf(tgt.trim());

                if (tgtIndex === -1 || tgtIndex == srcIndex) return;
                console.log(src, srcIndex, tgt)
                matrix[srcIndex][tgtIndex] += 1; // increment "follows"
            });
        });
    }
    console.log(matrix)
    const innerRadius = Math.min(width, height) * 0.4;
    const outerRadius = innerRadius + 10;
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const chord = d3.chord().padAngle(0.05);
    const chords = chord(matrix);
    const group = mainGroup.append("g")
        .selectAll("g")
        .data(chords.groups)
        .enter().append("g");
    group.append("path")
        .attr("d", arc)
        .style("fill", d => color(d.index))
        .style("stroke", d => d3.rgb(color(d.index)).darker());

    group.append("text")
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
//         .attr("transform", d => `
//     rotate(${(d.angle * 180 / Math.PI - 90)})
//     translate(${outerRadius + 10})
//     ${d.angle > Math.PI ? "rotate(180)" : ""}
//   `)
        .style("text-anchor", d => d.angle > Math.PI ? "end" : "start")
        .text(d => members[d.index]);

    const ribbon = d3.ribbon().radius(innerRadius);

    mainGroup.append("g")
        .selectAll("path")
        .data(chords)
        .enter().append("path")
        .attr("d", ribbon)
        .style("fill", d => color(d.target.index))
        .style("stroke", d => d3.rgb(color(d.target.index)).darker())
        .style("opacity", 0.7);

}