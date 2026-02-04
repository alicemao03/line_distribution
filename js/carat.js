const memberNames = ["S. Coups", "Jeonghan", "Joshua",
    "Jun", "Hoshi", "Wonwoo", "Woozi",
    "The8", "Mingyu", "DK",
    "Seungkwan", "Vernon", "Dino",
    "adlib", "All"]

const memberColors = [
    '#e32636', '#e3268bff', '#df73ff',
    '#949397ff', "#ff7423ff", "#975fbfff", "#D6EB6A",
    "#3ba042ff", '#14beb0ff', "#87CEEB",
    "#ffa941ff", "#313abfff", '#9b6a55ff',
    "#d0e4f5", "#fddbdb",
]

const colorScale = d3.scaleOrdinal()
    .domain(memberNames)
    .range(memberColors);


const margin = { top: 20, right: 40, bottom: 20, left: 40 };

var local_store_obj = { song: '' }
d3.json('json/final_meta_data.json').then(function (data) {
    console.log(data)
    data.forEach(function (data) {
        console.log("CUR ALBUM", data)
        const albumName = data['album_name']
        const regex = /'([^']+)'/
        const match = albumName.match(regex)
        const shorten_name = match ? match[1] : albumName
        const id = 'album' + shorten_name.replace(/[^a-z0-9]/gi, '_')

        const albumSection = d3.select("#all-songs-container")
            .append('div')
            .attr('class', 'album-section mb-5')

        const album_div = albumSection.append("div")
            .attr("class", "album-name-container")
            .attr('id', id)

        album_div.append('div')
            .attr('class', 'album-cover-img')
            .append("img")
            .attr("src", data["cover_art_url"])
            .attr("alt", albumName + " cover art")

        album_div.append('div')
            .attr('class', 'album-name')
            .text(shorten_name)

        const album_description = album_div.append('div')
            .attr('class', 'album-description')
        album_description.append('div')
            .text(data['album_type'])

        album_description.append('div')
            .text(data['release_date_for_display'])

        const container = d3.select('#all-songs-container')
        const name_container = d3.select('#' + id)
        const width = container.node().offsetWidth - name_container.node().offsetWidth;
        const height = 120 - margin.top - margin.bottom;

        const songRows = albumSection.append("div")
            .attr("class", 'song-section')
            .selectAll(".song-row")
            .data(data['tracks'])
            .enter()
            .append("div")
            .attr("class", "text-start mb-5 song-row");

        const songHeadings = songRows.append("div")
            .attr('class', 'song-heading-container d-flex justify-content-between')

        const songInfo = songHeadings.append('div')
            .attr('class', 'song-info')

        const tooltips = songHeadings.append('div')
            .attr('class', 'tooltips')


        songInfo.append('h2')
            .attr('class', 'song-title')
            .append('a')
            .attr('href', d => {
                return `./html/single_song.html?song=${d.english_name.replace("'", '').replace('!',)}`
            })
            .style('color', 'inherit')
            .text(d => d.english_name)
            .on('click', (event, d) => {
                local_store_obj = { song: d, color_domain: memberNames, color_scale: memberColors };
                localStorage.setItem('data', JSON.stringify(local_store_obj))
            });

        songInfo.append('p')
            .attr('class', 'album-title')
            .html(d => {
                // console.log('unit', d.unit)
                return `${d.unit.join(', ')} &#8226; ${d.synced_lyrics_source}`;
            });

        tooltips.append("div")
            .attr("class", "text-start tooltips")
            .attr("id", d => {
                return `tooltip-${d.norm_name}`
            })
            .style("width", width)

        const svgs = songRows.append("div")
            .attr("class", "overall-song-distribution")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style('border', 0)
            .append("g")

        // 3. Loop through songs in this album and draw charts

        svgs.each(function (data) {
            console.log(data)
            const currentSvg = d3.select(this);
            const merged_lines_data = data.synced_lyrics
            console.log("CURRENT SONG:", merged_lines_data)

            const xScale = d3.scaleLinear()
                .domain([0, data.duration])
                .range([0, width])

            currentSvg.selectAll("rect")
                .data(merged_lines_data)
                .enter()
                .append("rect")
                .attr("class", "lyric-rect")
                .attr("x", d => xScale(timeToSeconds(d.start)))
                .attr("width", d => {
                    // console.log(d.delta, d.lyric)
                    return xScale(d.delta)
                })
                .attr("y", 0)
                .attr("height", height)
                .attr("fill", d => {
                    if (d.member.length == 1) {
                        return colorScale(d.member[0])
                    } else {
                        return getGradientId(d.member, currentSvg, colorScale)
                    }
                })
                .on("mouseover", function (event, d) {
                    d3.select("#tooltip-" + data.norm_name)
                        .style("opacity", 1)
                        .html(`
                        <div class='member-name'>${d.member.join(', ')}</div>
                        <div class='lyric'>${d.lyric}</div>
                        <div class='timing'>${d.start} — ${d.end}</div>
                    `)
                        .style("left", "0 px")
                        .style("top", "0 px");
                })
                .on("mouseout", () => d3.select("#tooltip-" + data.norm_name).style("opacity", 0));
        })
    })
});

function timeToSeconds(timeStr) {
    // console.log(timeStr)
    const [minutes, seconds, tenths] = timeStr.split(':');
    // console.log(timeStr, minutes, seconds, tenths)
    return (parseInt(minutes) * 60) + parseInt(seconds) + parseFloat(tenths) / 100;
}

function getGradientId(members, svg, colorScale) {
    if (members.length == 0) {
        return 'black'
    }
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
