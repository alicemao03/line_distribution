const memberNames = ["S.Coups", "Jeonghan", "Joshua",
    "Jun", "Hoshi", "Wonwoo", "Woozi",
    "THE8", "The8", "Mingyu", "Dk",
    "Seungkwan", "Vernon", "Dino",
    "adlibs", "ALL"]

const colorScale = d3.scaleOrdinal()
    .domain(memberNames)
    .range([
        '#e32636', '#e3268bff', '#df73ff',
        '#949397ff', "#ff7423ff", "#975fbfff", "#D6EB6A",
        "#3ba042ff", "#3ba042ff", '#14beb0ff', "#87CEEB",
        "#ffa941ff", "#313abfff", '#9b6a55ff',
        "#d0e4f5", "#fddbdb"
    ]);


const margin = { top: 20, right: 40, bottom: 20, left: 40 };

d3.json('json/meta_data.json').then(function (data) {
    const container = d3.select("#all-songs-container");
    const width = container.node().clientWidth;
    const height = 120 - margin.top - margin.bottom;

    const songRows = d3.select("#all-songs-container")
        .selectAll(".song-row")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "text-start mx-1 mb-5 song-row");

    const songHeadings = songRows.append("div")
        .attr('class', 'song-heading-container d-flex justify-content-between')

    const songInfo = songHeadings.append('div')
        .attr('class', 'song-info')

    const tooltips = songHeadings.append('div')
        .attr('class', 'tooltips')


    songInfo.append('h2')
        .attr('class', 'song-title')
        .append('a')
        .attr('href', d => `single_song.html?song=${d.trackName}`)
        // .attr('target', '_blank') 
        .style('color', 'inherit')
        .text(d => d.trackName)

    songInfo.append('p')
        .attr('class', 'album-title')
        .html(d => {
            return `${d.albumName} <span class="big-dot">&middot;</span> ${d.unit} <span class="big-dot">&middot;</span> ${d.source}`;
        });

    tooltips.append("div")
        .attr("class", "text-start tooltips")
        .attr("id", d => `tooltip-${d.name.toLowerCase().split(' ').join('-')}`)
        .style("width", width)


    const svgs = songRows.append("div")
        .attr("class", "overall-song-distribution")
        .append("svg")
        .style("width", width)
        .attr("height", height)
        .append("g")


    svgs.each(function (data) {
        const currentSvg = d3.select(this);
        console.log("CURRENT SONG:", data, currentSvg)

        const xScale = d3.scaleLinear()
            .domain([0, data.duration])
            .range([0, width])

        currentSvg.selectAll("rect")
            .data(data.syncedLyrics)
            .enter()
            .append("rect")
            .attr("class", "lyric-rect")
            .attr("x", d => xScale(timeToSeconds(d.start)))
            .attr("width", d => xScale(timeToSeconds(d.end)) - xScale(timeToSeconds(d.start)))
            .attr("y", 0)
            .attr("height", height)
            .attr("fill", d => {
                if (d.member.length == 1) {
                    return colorScale(d.member[0])
                } else {
                    return getGradientId(d.member, currentSvg)
                }
            })
            .on("mouseover", function (event, d) {
                d3.select("#tooltip-" + data.name.toLowerCase().split(' ').join('-'))
                    .style("opacity", 1)
                    .html(`
                        <div class='member-name'>${d.member.join(', ')}</div>
                        <div class='lyric'>${d.lyric}</div>
                        <div class='timing'>${d.start} — ${d.end}</div>
                    `)
                    .style("left", "0 px")
                    .style("top", "0 px");
            })
            .on("mouseout", () => d3.select("#tooltip-" + data.name.toLowerCase().split(' ').join('-')).style("opacity", 0));
    })
});


function timeToSeconds(timeStr) {
    // console.log(timeStr)
    const [minutes, seconds, tenths] = timeStr.split(':');
    // console.log(timeStr, minutes, seconds, tenths)
    return (parseFloat(minutes) * 60) + parseFloat(seconds) + parseFloat(tenths) / 100;
}

function getGradientId(members, svg) {
    console.log(members)
    const id = "grad-" + members.map(m => m.replaceAll(' ', '')).sort().join('-')

    let defs = svg.select("defs");
    if (defs.empty()) defs = svg.append("defs");

    if (defs.select(`#${id}`).empty()) {
        const grad = defs.append("linearGradient")
            .attr("id", id)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%"); // Vertical orientation

        const step = 100 / members.length;

        members.forEach((member, i) => {
            // Add a stop for the start of the color block
            grad.append("stop")
                .attr("offset", (i * step) + "%")
                .attr("stop-color", colorScale(member));

            // Add a stop for the end of the color block (creates a "hard" edge)
            grad.append("stop")
                .attr("offset", ((i + 1) * step) + "%")
                .attr("stop-color", colorScale(member));
        });
    }
    return `url(#${id})`;
}
