export function renderLyrics(data, color, onLyricClick) {
    console.log("LYRICS", data)
    const sections = d3.group(data, d => d.section)

    console.log(sections)
    const lyricLines = d3.select("#song-area")
        .selectAll(".lyric-section")
        .data(sections)
        .enter()
        .append("div")
        .attr("class", "lyric-section")

    lyricLines.append("div")
        .attr("class", "section_name")
        .text(d => d[0])

    lyricLines.selectAll(".lyric-line")
        .data(d => d[1]) // the array of lyrics in this section
        .enter()
        .append("div")
        .attr("class", "lyric-line")
        .html(d => d.lyric)
        .style("background", d => {
            // 1. If only one member, just return a solid color
            if (d.member.length === 1) return color(d.member[0]);

            // 2. If multiple members, build a "hard-edge" CSS gradient string
            const step = 100 / d.member.length;
            const stops = d.member.map((member, i) => {
                const c = color(member);
                return `${c} ${i * step}%, ${c} ${(i + 1) * step}%`;
            }).join(", ");

            return `linear-gradient(to bottom, ${stops})`;
        })
        // 3. This "clips" the background so it only shows through the text characters
        .style("-webkit-background-clip", "text")
        .style("background-clip", "text")
        .style("-webkit-text-fill-color", "transparent")
        .style("color", "transparent")
        .on("click", (event, d) => {
            onLyricClick(d, event); // 👈 delegate upward
        });


    return lyricLines
}
