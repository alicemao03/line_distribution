export function chordMatrix(data, matrix, directedCounts, members, song, album) {
    console.log(data)
    for (let i = 0; i < data.length - 1; i++) {
        const currentLine = data[i];
        var nextLine = data[i + 1];
        const currentMembers = currentLine.member.filter(m => members.includes(m))
        if (currentMembers.length == 0) continue
        var nextMembers = nextLine.member.filter(m => members.includes(m))

        var inc = 0
        while (nextMembers.length == 0) {
            inc += 1
            if (inc == data.length) { break }
            nextLine = data[inc + i]

            nextMembers = nextLine.member.filter(m => members.includes(m))
            console.log("SKIP", nextLine)
        }
        i += Math.max(inc - 1, 0)
        console.log(i, 'currLine', currentLine, 'nextLine', nextLine)

        currentMembers.forEach(src => {
            const srcIndex = members.indexOf(src);
            if (srcIndex === -1) return;

            nextMembers.forEach(tgt => {
                const tgtIndex = members.indexOf(tgt.trim());

                if (tgtIndex === -1 || tgtIndex == srcIndex) return;
                matrix[srcIndex][tgtIndex] += 1

                console.log(srcIndex, tgtIndex)

                const key = `${srcIndex}->${tgtIndex}`

                if (!directedCounts.has(key)) {
                    directedCounts.set(key, [])
                }

                directedCounts.get(key).push({
                    from: members[srcIndex],
                    to: members[tgtIndex],
                    album: album,
                    song: song,
                    lineIndex: currentLine.line,
                    section: currentLine.section,
                    lyric: currentLine.lyric,
                    to_line: currentLine,
                    from_line: nextLine
                })
            });
        });
    }

    return { matrix, directedCounts }
}

export function getBiDirectionalCount(matrix, members) {
    let bidirectionalCount = Array(members.length)

    for (let i = 0; i < members.length; i++) {
        for (let j = 0; j < members.length; j++) {
            bidirectionalCount[i] = matrix[i][j]
        }
    }
}

export function renderChord(members, matrix, directedCounts, svg, tooltip, color, width, height, margin, member_abr) {
    console.log("directedCounts", directedCounts)
    const mainGroup = svg.append("g")
        .attr('class', 'chord-chart')
        .attr("transform", `translate(${(width + margin.left + margin.right) / 2},
                       ${(height + margin.top + margin.bottom) / 2})`)


    const innerRadius = Math.min(width, height) * 0.4;
    const outerRadius = innerRadius + 10;
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const chord = d3.chord().padAngle(0.05);
    const chords = chord(matrix)

    const group = mainGroup.append("g")
        .selectAll("g")
        .data(chords.groups)
        .enter().append("g")

    //https://www.visualcinnamon.com/2016/06/orientation-gradient-d3-chord-diagram/
    //Create a gradient definition for each chord
    var grads = svg.append("defs").selectAll("linearGradient")
        .data(chords)
        .enter().append("linearGradient")
        //Create a unique gradient id per chord: e.g. "chordGradient-0-4"
        .attr("id", function (d) {
            return "chordGradient-" + d.source.index + "-" + d.target.index;
        })
        //Instead of the object bounding box, use the entire SVG for setting locations
        //in pixel locations instead of percentages (which is more typical)
        .attr("gradientUnits", "userSpaceOnUse")
        //The full mathematical formula to find the x and y locations 
        //of the Avenger's source chord
        .attr("x1", function (d, i) {
            return innerRadius * Math.cos((d.source.endAngle - d.source.startAngle) / 2 +
                d.source.startAngle - Math.PI / 2);
        })
        .attr("y1", function (d, i) {
            return innerRadius * Math.sin((d.source.endAngle - d.source.startAngle) / 2 +
                d.source.startAngle - Math.PI / 2);
        })
        //Find the location of the target Avenger's chord
        .attr("x2", function (d, i) {
            return innerRadius * Math.cos((d.target.endAngle - d.target.startAngle) / 2 +
                d.target.startAngle - Math.PI / 2);
        })
        .attr("y2", function (d, i) {
            return innerRadius * Math.sin((d.target.endAngle - d.target.startAngle) / 2 +
                d.target.startAngle - Math.PI / 2);
        })


    grads.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", function (d) {
            return color[d.source.index]
        });

    //Set the ending color (at 100%)
    grads.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", function (d) { return color[d.target.index] })


    let cordState = false
    let lockedChord = null
    let sectionState = false
    let lockedSection = null


    group.append("path")
        .attr("fill", d => color[d.index])
        .attr("stroke", d => color[d.index])
        .attr("d", arc)
        .attr("class", "chord_section")
        .each(function (d, i) {
            // https://www.visualcinnamon.com/2015/09/placing-text-on-arcs/
            //A regular expression that captures all in between the start of a string
            //(denoted by ^) and the first capital letter L
            var firstArcSection = /(^.+?)L/;

            //The [1] gives back the expression between the () (thus not the L as well)
            //which is exactly the arc statement
            var newArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
            console.log("new arc", firstArcSection.exec(d3.select(this).attr("d")), d3.select(this).attr("d"))
            //Replace all the comma's so that IE can handle it -_-
            //The g after the / is a modifier that "find all matches rather than
            //stopping after the first match"
            newArc = newArc.replace(/,/g, " ");
            console.log("new arc", newArc)

            //flip the end and start position
            if (d.endAngle > Math.PI / 180 * 120 && d.startAngle < Math.PI / 180 * 240) {
                //Everything between the capital M and first capital A
                var startLoc = /M(.*?)A/;
                //Everything between the capital A and 0 0 1
                var middleLoc = /A(.*?)0 0 1/;
                //Everything between the 0 0 1 and the end of the string (denoted by $)
                var endLoc = /0 0 1 (.*?)$/;
                //Flip the direction of the arc by switching the start and end point
                //and using a 0 (instead of 1) sweep flag
                var newStart = endLoc.exec(newArc)[1];
                var newEnd = startLoc.exec(newArc)[1];
                var middleSec = middleLoc.exec(newArc)[1];

                //Build up the new arc notation, set the sweep-flag to 0
                newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
            }

            //Create a new invisible arc that the text can flow along
            svg.append("path")
                .attr("class", "hiddenTextArcs")
                .attr("id", "textArc" + i)
                .attr("d", newArc)
                .style("fill", "none");
        })
        .on("mouseover", (event, d) => {
            if (cordState || lockedSection) return
            highlightSection(d)
        })
        .on("mouseout", onMouseOut)
        .on("click", (event, d) => {
            if (lockedSection === d) {
                lockedSection = null
                sectionState = false
                tooltip.style("opacity", 0);
                d3.selectAll(".chord_section").style("opacity", 1)
                d3.selectAll(".chord").style("opacity", 0.6)
                return;
            }

            if (lockedChord) {
                lockedChord = null
                cordState = false
                // tooltip.style("opacity", 0);
                d3.selectAll(".chord").style("opacity", 0.6);
            }

            sectionState = true
            lockedSection = d
            highlightSection(d)
        })

    group.append("text")
        .attr("class", "memberText")
        .attr("dy", d => (d.endAngle > Math.PI / 180 * 120 && d.startAngle < Math.PI / 180 * 240 ? 25 : -15))
        .append("textPath")
        .attr("startOffset", "50%")
        .style("text-anchor", "middle")
        .attr("href", d => "#textArc" + d.index)
        .html(d => {
            const full = members[d.index]

            // get arc length
            const path = d3.select("#textArc" + d.index).node();
            const arcLength = path.getTotalLength();

            const avgCharWidth = 10;
            const textLength = full.length * avgCharWidth;

            return textLength > arcLength
                ? "&#" + member_abr[d.index]
                : full;
        })
        .style("fill", "#000")
        .style("font-size", "20px")


    /* FOR EACH RIBBON */
    const ribbon = d3.ribbon().radius(innerRadius)
    mainGroup.append("g")
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("class", "chord")
        .style("fill", function (d) {
            return "url(#chordGradient-" + d.source.index + "-" + d.target.index + ")";
        })
        .attr("opacity", 0.6)
        .attr("d", ribbon)
        .on("mouseover", (event, d) => {
            if (cordState || lockedSection) return
            highlightChord(event, d)
        })
        .on("mouseout", (event, d) => onMouseOut(d.source))
        .on("click", function (event, d) {
            if (lockedChord === d) {
                lockedChord = null
                cordState = false
                tooltip.style("opacity", 0);
                d3.selectAll(".chord").style("opacity", 0.6);
                return;
            }

            if (lockedSection) {
                lockedSection = null
                section = false
                tooltip.style("opacity", 0);
                d3.selectAll(".chord").style("opacity", 0.6);
            }

            cordState = true
            lockedChord = d
            highlightChord(event, d)
        })


    function highlightSection(selected) {
        if (cordState) return
        console.log("selected", selected)
        tooltip.style('opacity', 0)
        group.filter(d => d.index !== selected.index)
            .style("opacity", 1)

        mainGroup.selectAll(".chord")
            .style("opacity", d =>
                d.source.index === selected.index || d.target.index === selected.index ? 1 : 0
            )

        var currMem = members[selected.index]
        highlightLinesByMember(currMem)
    }

    function onMouseOut() {
        if (cordState || sectionState) return
        group.style("opacity", 1);
        mainGroup.selectAll(".chord")
            .style("opacity", 0.6);
    }


    function highlightChord(event, d) {
        const sourceName = members[d.source.index];
        const targetName = members[d.target.index];
        const count = d.source.value + d.target.value
        const sourceTarget = directedCounts.get(`${d.source.index}->${d.target.index}`)
        const sourceTargetVal = sourceTarget?.length || 0
        const targetSource = directedCounts.get(`${d.target.index}->${d.source.index}`)
        const targetSourceVal = targetSource?.length || 0

        tooltip
            .style("opacity", d => { console.log('tootltip'); return 1 })
            .html(`
                    <strong> ${sourceName} / ${targetName}</strong> <br />
                    ${count} time${count === 1 ? "" : "s"} <br/>
           
                    <strong>${sourceName} → ${targetName}</strong><br/>
                    ${sourceTargetVal} time${sourceTargetVal === 1 ? "" : "s"}<br/>
             
                    <strong>${targetName} → ${sourceName}</strong><br/>
                    ${targetSourceVal} time${targetSourceVal === 1 ? "" : "s"}
            `)
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY + 12) + "px")

        d3.selectAll(".chord").style("opacity", 0.1)
        d3.select(event.currentTarget).style("opacity", 1)

        var lines = []
        if (sourceTarget) lines = lines.concat(sourceTarget)
        if (targetSource) lines = lines.concat(targetSource)
        console.log("LINE", lines)
        highlightLinesByConnection(lines)
    }

    d3.select("body").on("click", (event) => {
        if (!event.target.closest(".chord-chart")) {
            console.log("background clicked — resetting selection");
            lockedChord = null
            lockedSection = null
            cordState = false
            lockedSection = false
            tooltip.style("opacity", 0);
            d3.selectAll(".chord").style("opacity", 0.6);

            d3.selectAll(".lyric-line")
                .classed("dimmed", false)
                .classed("highlighted", false)
                .style("border-left-color", "transparent")

        }
    });


    function highlightLinesByConnection(lines) {
        let lineSet = new Set()
        for (let i = 0; i < lines.length; i++) {
            console.log("newline", lines[i])
            lineSet.add(lines[i]['to_line'])
            lineSet.add(lines[i]['from_line'])
        }

        console.log(lineSet)
        d3.selectAll(".lyric-line")
            .each(function (lineData) {
                var isMatch = null
                if (lineSet.has(lineData)) {
                    console.log("found", lineData)
                    isMatch = true
                } else {
                    isMatch = false
                }

                d3.select(this)
                    .classed("dimmed", !isMatch)
                    .classed("highlighted", isMatch)
                    .style("border-left-color", d => {
                        // We still need this for the single-color case
                        return d.member.length === 1 ? color[members.indexOf(d.member[0])] : "transparent";
                    })
                    .style("border-image", d => {
                        if (!isMatch || d.member.length <= 1) {
                            return "none";
                        }
                        const step = 100 / d.member.length;
                        const stops = d.member.map((member, i) => {
                            console.log("member", members)
                            const c = color[members.indexOf(member)];
                            return `${c} ${i * step}%, ${c} ${(i + 1) * step}%`;
                        }).join(", ");

                        return `linear-gradient(to bottom, ${stops}) 1`;
                    })
            });
    }
    
    function highlightLinesByMember(member) {
        d3.selectAll(".lyric-line")
            .each(function (lineData) {
                var mems = new Set(lineData['member'])
                var isMatch = null
                if (mems.has(member)) {
                    console.log("found", lineData)
                    isMatch = true
                } else {
                    isMatch = false
                }

                d3.select(this)
                    .classed("dimmed", !isMatch)
                    .classed("highlighted", isMatch)
                    .style("border-left-color", d => {
                        // We still need this for the single-color case
                        return color[members.indexOf(member)];
                    })
            });
    }
}