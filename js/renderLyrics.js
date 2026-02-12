export function renderLyrics(data, color, onLyricClick) {

    data = mergeLyrics(data)
    console.log("LYRICS", data)

    const lyricLines = d3.select("#song-area")
        .selectAll(".lyric-section")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "lyric-section")

    lyricLines.append("div")
        .attr("class", "section_name")
        .text(d => "[ " + d['name'] + " ]")

    lyricLines
        .selectAll(".lyric-line")
        .data(d => d['lines']) // the array of lyrics in this section
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
            onLyricClick(d, event);
        });

    return lyricLines
}


function sameMembers(a, b) {
    if (a.length !== b.length) return false;

    const setA = new Set(a);
    return b.every(m => setA.has(m));
}

export function mergeLyrics(data) {
    var currSection = { 'name': null, 'lines': [] }
    var currLineNum = 0
    var currentMember = []

    var newData = []
    var array_i = 0

    for (var i = 0; i < data.length; i++) {
        let currLine = data[i]

        if (currLine['section'] != currSection['name']) {
            currSection = { 'name': null, 'lines': [] }
            currSection['name'] = currLine['section']
            newData.push(currSection)
            array_i = 0
            console.log('add section', currSection)

            currLineNum = 0
            currentMember = []
        }

        if (!sameMembers(currLine['member'], currentMember)) {
            array_i += 1
            currSection['lines'].push(currLine)
            currLineNum = currLine['line']
            currentMember = currLine['member']
            console.log('add line', currLine, array_i)
        }
        else if (currLine['line'] != currLineNum && sameMembers(currLine['member'], currentMember)) {
            currLineNum = currLine['line']
            currentMember = currLine['member']
            console.log('merge', currSection['lines'][array_i - 1], array_i)
            currSection['lines'][array_i - 1]['lyric'] += `<br>${currLine['lyric']}`
            currSection['lines'][array_i - 1]['duration'] += currLine['duration']
            currSection['lines'][array_i - 1]['end'] = currLine['end']
        }

    }
    console.log(newData)
    return newData
}
