export function renderLyrics(data, color, svg) {
    const lyricLines = d3.select("#song-area")
        .selectAll(".lyric-line")
        .data(data) // 'data' is the array from your CSV
        .enter()
        .append("div")
        .attr("class", "lyric-line")
        .text(d => d.lyric)
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

    return lyricLines
}
