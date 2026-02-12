import { renderChord, chordMatrix } from "./renderChord.js";

const members = ["S. Coups", "Jeonghan", "Joshua",
    "Jun", "Hoshi", "Wonwoo", "Woozi",
    "The8", "Mingyu", "DK",
    "Seungkwan", "Vernon", "Dino"]

const memberColors = [
    '#e32636', '#e3268bff', '#df73ff',
    '#949397ff', "#ff7423ff", "#975fbfff", "#D6EB6A",
    "#3ba042ff", '#14beb0ff', "#87CEEB",
    "#ffa941ff", "#313abfff", '#9b6a55ff'
]

const colorScale = d3.scaleOrdinal()
    .domain(members)
    .range(memberColors);

d3.json('json/final_meta_data.json').then(function (data) {
    // data = [data[0]]
    let matrix = Array.from({ length: members.length }, () => Array(members.length).fill(0))
    let directedCounts = new Map()
    console.log(matrix)

    for (let album_i = 0; album_i < data.length; album_i++) {
        // const tracks = [data[album_i]['tracks'][0]]
        const tracks = data[album_i]['tracks']
        for (let track_i = 0; track_i < tracks.length; track_i++) {
            console.log(tracks[track_i])
            const lines = tracks[track_i]['synced_lyrics']

            const getChord = chordMatrix(lines, matrix, directedCounts, members, data[album_i]['album_name'], tracks[track_i]['english_name'])
            matrix = getChord['matrix']
            directedCounts = getChord['directedCounts']
        }
    }

    const width = 1000
    const height = 800
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3.select("#overview-body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)

    svg.selectAll("*").remove()

    const tooltip = d3.select("#overview-body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.85)")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);


    renderChord(members, matrix, directedCounts, svg, tooltip, colorScale, width, height, margin)

})

