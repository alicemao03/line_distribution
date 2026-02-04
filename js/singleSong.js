import { renderLyrics } from "./renderLyrics.js";
import { renderPieChart } from "./renderPieChart.js";
import { renderBar } from "./renderBar.js";
import { renderChord } from "./renderChord.js";

let margin = { top: 20, right: 20, bottom: 20, left: 20 };


let selectedMember = [];
let oldSelection = null;

const urlParams = new URLSearchParams(window.location.search);
const store = JSON.parse(localStorage.getItem('data'))
console.log(store)
const song = store['song']
const color_domain = store['color_domain']
const color_scale = store['color_scale']
const data = song['synced_lyrics']
console.log(data)

const color = d3.scaleOrdinal()
    .domain(color_domain)
    .range(color_scale);

var title = d3.select("#song-name").append('h3').text(song['english_name'])

let svt_line_timing = calcTiming(data, color_domain)
console.log(svt_line_timing)


function updateChart() {
    let selection = d3.select("#chart-select").property("value")
    console.log("selection:", selection)

    var single_song_body = d3.select("#single-song-body")
    single_song_body.html("")

    let paths = null
    if (selection === "chord") {
        single_song_body.append('div').attr('id', 'chart-area-chord')

        let width = window.innerWidth / 2 - margin.left - margin.right - 100,
            height = 700 - margin.top - margin.bottom;

        var svg = d3.select("#chart-area-chord").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("style", "max-width: 100%; height: auto;")

        svg.selectAll("*").remove()

        paths = renderChord(song['featured_artists'], data, svg, color, width, height, margin);
    } else {
        single_song_body.append('div')
            .attr('class', 'col-4 me-2 mb-4')
            .append('div').attr('class', 'sticky-wrapper').append('div').attr('id', 'chart-area')

        single_song_body.append('div')
            .attr('class', 'col-3 ms-5')
            .attr('id', 'song-area')

        let width = window.innerWidth / 2 - margin.left - margin.right - 100,
            height = 500 - margin.top - margin.bottom;

        var svg = d3.select("#chart-area").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("style", "max-width: 100%; height: auto;");

        svg.selectAll("*").remove()
        d3.select("#song-area").html("")

        if (selection === "bar") {
            paths = renderBar(svg, svt_line_timing.timing, width, height, margin, color, color_domain);
        } else if (selection === "pie") {
            paths = renderPieChart(svg, svt_line_timing.timing, width, height, color);
        }
    }

    const lyricLines = renderLyrics(data, color, (lyric, event) => {
        const clickedMember = lyric.member;
        console.log("clicked lyric", clickedMember, selection);
        handleMemberClick(clickedMember, selection, false);
    });

    if (selectedMember.length != 0) {
        handleMemberClick(selectedMember, selection, true)
    }

    let clickedMember = null
    paths.on("click", function (event, d) {
        if (selection == 'bar') {
            clickedMember = [d.member]
        } else {
            clickedMember = [d.data.member]
        }
        console.log('clicked', clickedMember, selection)

        handleMemberClick(clickedMember, selection, false)
    });
}

d3.select("#chart-select").on("change", updateChart)
updateChart()

d3.select("body").on("click", (event) => {
    const target = event.target;

    // check if click was on lyric line or chart fragment
    if (!target.closest(".lyric-line") && !target.closest(".chart-fragment")) {
        console.log("background clicked — resetting selection");
        resetViz()
    }
});

function timeToSeconds(timeStr) {
    // console.log(timeStr)
    const [minutes, seconds, tenths] = timeStr.split(':');
    // console.log(timeStr, minutes, seconds, tenths)
    return (parseFloat(minutes) * 60) + parseFloat(seconds) + parseFloat(tenths) / 100;
}

function calcTiming(data, memberNames) {
    let svtSongData = memberNames.map(name => ({
        member: name,
        seconds: 0
    }));
    console.log('svtSongData', data)

    let totalTime = 0
    for (let i = 0; i < data.length; i++) {
        const line = data[i]
        const members = line.member

        const secs = timeToSeconds(line.end) - timeToSeconds(line.start)
        // console.log('secs', secs)
        for (var j = 0; j < members.length; j++) {
            let member = members[j]
            console.log("new memebr", member)
            let member_seconds = svtSongData.find(m => m.member === member);

            if (member_seconds) {
                member_seconds.seconds += secs;
            } else {
                svtSongData.push({ member: member, seconds: secs })
                console.log("add member", line)
            }
            totalTime += secs
        }
    }

    svtSongData = svtSongData.filter(d => d.seconds > 0 && d.member)
    console.log(svtSongData)

    return { timing: svtSongData, totalTime: totalTime }
}

function resetViz() {
    selectedMember = [];
    // Reset all lyrics to full opacity
    d3.selectAll(".lyric-line")
        .classed("dimmed", false)
        .classed("highlighted", false)
        .style("border-left-color", "transparent");
    d3.selectAll(".chart-fragment")
        .classed("dimmed", false)
        .classed("highlighted", false)
        .style("border-left-color", "transparent");
}

function handleMemberClick(clickedMember, selection, updatingChart) {
    console.log('new', clickedMember, selection, updatingChart)
    // Toggle logic: If you click the same member again, reset everything
    var isReset = true

    if (selectedMember.length == clickedMember.length) {
        for (var i = 0; i < selectedMember.length; i++) {
            if (selectedMember[i] != clickedMember[i]) {
                isReset = false
                break
            }
        }
    } else {
        isReset = false
    }

    if (isReset && !updatingChart) {
        resetViz()
    } else {
        selectedMember = clickedMember;
        console.log(selectedMember)
        // Update the lyrics display
        d3.selectAll(".lyric-line")
            .each(function (lineData) {
                const currentMem = lineData.member

                var isMatch = 0

                if (currentMem.length == clickedMember.length) {
                    for (var i = 0; i < currentMem.length; i++) {
                        if (currentMem[i] == clickedMember[i]) {
                            isMatch += 1
                        }
                    }
                } else {
                    isMatch = false
                }

                d3.select(this)
                    .classed("dimmed", !isMatch)
                    .classed("highlighted", isMatch)
                    .style("border-left-color", d => {
                        // We still need this for the single-color case
                        return d.member.length === 1 ? color(d.member[0]) : "transparent";
                    })
                    .style("border-image", d => {
                        if (!isMatch || d.member.length <= 1) {
                            return "none";
                        }

                        const step = 100 / d.member.length;
                        const stops = d.member.map((member, i) => {
                            const c = color(member);
                            return `${c} ${i * step}%, ${c} ${(i + 1) * step}%`;
                        }).join(", ");

                        return `linear-gradient(to bottom, ${stops}) 1`;
                    })
            });

        d3.selectAll(".chart-fragment")
            .each(function (lineData) {
                let isMatch = null

                if (selection == 'bar') {
                    isMatch = clickedMember.includes(lineData.member)

                } else {
                    isMatch = clickedMember.includes(lineData.data.member)
                }

                // Toggle classes based on match
                d3.select(this)
                    .classed("dimmed", !isMatch)
                    .classed("highlighted", isMatch)
                    .style("border-left-color", isMatch ? color(clickedMember) : "transparent");
            });
    }
}