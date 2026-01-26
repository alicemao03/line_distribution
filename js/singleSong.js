import { renderLyrics } from "./renderLyrics.js";
import { renderPieChart } from "./renderPieChart.js";
import { renderBar } from "./renderBar.js";

let margin = { top: 20, right: 20, bottom: 20, left: 20 };


let width = window.innerWidth / 2 - margin.left - margin.right - 100,
    height = 500 - margin.top - margin.bottom;

const memberNames = ["S. Coups", "Jeonghan", "Joshua",
    "Jun", "Hoshi", "Wonwoo", "Woozi",
    "The8", "Mingyu", "Dk",
    "Seungkwan", "Vernon", "Dino",
    "adlib", "ALL"]

const color = d3.scaleOrdinal()
    .domain(memberNames)
    .range([
        '#e32636', '#e3268bff', '#df73ff',
        '#949397ff', "#ff7423ff", "#975fbfff", "#D6EB6A",
        "#3ba042ff", '#14beb0ff', "#87CEEB",
        "#ffa941ff", "#313abfff", '#9b6a55ff',
        "#d0e4f5", "#fddbdb"
    ]);



let selectedMember = [];
let oldSelection = null;

const urlParams = new URLSearchParams(window.location.search);
const song = urlParams.get('song')
console.log(song.toLowerCase().replaceAll(' ', '_'));

d3.json('./json/songs/' + song.toLowerCase().replaceAll(' ', '_') + '.json').then(function (data) {

    data = data['syncedLyrics']
    console.log(data)
    let svt_line_timing = calcTiming(data)
    console.log(svt_line_timing)

    var title = d3.select("#song-name").append('h3').text(song)

    var svg = d3.select("#chart-area").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("style", "max-width: 100%; height: auto;");

    function updateChart() {
        let selection = d3.select("#chart-select").property("value");

        console.log("selection:", selection)
        svg.selectAll("*").remove();
        d3.select("#song-area").html("");

        let paths = null

        if (selection === "bar") {
            paths = renderBar(svg, svt_line_timing.timing, width, height, margin, color, memberNames);
        } else if (selection === "pie") {
            paths = renderPieChart(svg, svt_line_timing.timing, width, height, color);
        }
        const lyricLines = renderLyrics(data, color, svg)

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

        lyricLines.on("click", function (event, d) {
            clickedMember = d.member
            console.log('clicked', clickedMember, selection)
            handleMemberClick(clickedMember, selection, false)
        });

    }

    d3.select("#chart-select").on("change", updateChart);
    updateChart();
});


function timeToSeconds(timeStr) {
    // console.log(timeStr)
    const [minutes, seconds, tenths] = timeStr.split(':');
    console.log(timeStr, minutes, seconds, tenths)
    return (parseFloat(minutes) * 60) + parseFloat(seconds) + parseFloat(tenths) / 100;
}

function calcTiming(data) {
    let svtSongData = memberNames.map(name => ({
        member: name,
        seconds: 0
    }));
    console.log('svtSongData', svtSongData)

    let totalTime = 0
    for (let i = 0; i < data.length; i++) {
        const line = data[i]
        console.log(line)

        const members = line.member
        console.log(members)

        const secs = timeToSeconds(line.end) - timeToSeconds(line.start)
        console.log('secs', secs)
        for (var j = 0; j < members.length; j++) {
            let member = members[j]
            console.log("new memebr", member)
            let member_seconds = svtSongData.find(m => m.member === member);
            //    , member_seconds)
            if (member) {
                member_seconds.seconds += secs;
            } else {
                console.log("something borke", line)
            }
            totalTime += secs
        }
    }

    svtSongData = svtSongData.filter(d => d.seconds > 0 && d.member)
    console.log(svtSongData)

    return { timing: svtSongData, totalTime: totalTime }
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