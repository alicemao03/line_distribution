import { renderLyrics, mergeLyrics } from "./renderLyrics.js";
import { renderPieChart } from "./renderPieChart.js";
import { renderBar } from "./renderBar.js";
import { renderChord, chordMatrix } from "./renderChord.js";

let margin = { top: 20, right: 20, bottom: 20, left: 20 };

let selectedMember = [];

const store = JSON.parse(localStorage.getItem('data'))
console.log(store)

const song = store['song']
const album = store['album']
const color_domain = store['color_domain']
const color_scale = store['color_scale']
const member_abr = ["127826", "128519", "128048", "128049", "128047", "129418", "127834", "128056", "128054", "127829", "127818", "128034", "129446"]
const sectioned_data = mergeLyrics(song['synced_lyrics'])
var data = []
for (let i = 0; i < sectioned_data.length; i++) {
    for (let j = 0; j < sectioned_data[i]['lines'].length; j++) {
        data.push(sectioned_data[i]['lines'][j])
    }
}

let svt_line_timing = calcTiming(data, color_domain)
console.log(svt_line_timing)

const members = svt_line_timing.timing.map(d => d.member).filter(m => m !== 'adlib' && m !== 'All')
console.log(members)

let new_color_scale = Array(members.length)
for (let i = 0; i < members.length; i++) {
    new_color_scale[i] = color_scale[color_domain.indexOf(members[i])]
}

console.log("new_color_scale", new_color_scale)
const color = d3.scaleOrdinal()
    .domain(members)
    .range(new_color_scale)


function updateHeader() {
    $(".single-song-heading").css("color", song['song_art_text_color'])
        .css("background-image", `linear-gradient(to bottom, ${song["song_art_primary_color"]}, ${song["song_art_secondary_color"]}`)


    d3.select("#song-img").append('img')
        .attr("src", song['song_art_image_url'])
        .attr("alt", song['english_name'] + " cover art")


    d3.select("#song-name").append('h1').html(song['english_name'])

    d3.select("#artist-name").html(() => {
        let names = "SEVENTEEN"

        if (song["featured_artists"].length) {
            names += " feat. "
            names += song["featured_artists"].join(', ')
        }

        if (song['unit'] == "OT13") {
            return `<h4>${names}</h4>`
        }
        names += ` (${song['unit']} unit)`
        return `<h4>${names}</h4><p>${song['main_artists'].join(', ')}</p>`
    })

    const album_info = d3.select("#album-info")
    const trackNames = album['tracks'].map(t => t.english_name)
    console.log("trackNames", trackNames)
    album_info.append("p").text(`Track ${trackNames.indexOf(song['english_name']) + 1} on`)
    album_info.append("h4").text(album["album_name"])
    album_info.append("p").text(album['album_type'])
    album_info.append("p").text(album["release_date"])
}

function updateFooter() {
    $(".single-song-footer").css("color", song['song_art_text_color'])
        .css("background-image", `linear-gradient(to bottom, ${song["song_art_primary_color"]}, ${song["song_art_secondary_color"]}`)

    if (song['media'].length) {
        const media_section = d3.select("#media-section")
        // media_section.append('h3').text("Media")

        for (let i = 0; i < song['media'].length; i++) {
            const element = song['media'][i]
            var url = element['url']

            if (element['provider'].toLowerCase() === "youtube") {
                const id =
                    url.includes("watch?v=")
                        ? url.split("watch?v=")[1].split("&")[0]
                        : url.split("/").pop();

                url = `https://www.youtube.com/embed/${id}`;
            }

            const indiv_media = media_section.append('div').attr('class', 'indiv-media')
            // indiv_media.append('h4').attr('class', 'media-source').text(element['provider'].toUpperCase())
            indiv_media.append('iframe')
                .attr('class', 'media')
                .attr("src", url)
                .attr("alt", element['provider'] + " media")
                .attr('width', '560px')
                .attr('height', '315px')
        }
    }


    d3.select("#song-img-footer").append('img')
        .attr("src", album['cover_art_url'])
        .attr("alt", album['album_name'] + " cover art")

    const album_title = d3.select("#album-title")
    album_title.append('h4').text(album["album_name"])
    album_title.append("text").text(album['album_type'])

    const album_tracklist = d3.select("#album-tracklist")
    for (let i = 0; i < album['tracks'].length; i++) {
        const t = album['tracks'][i]
        console.log("song", t)
        const song_container = album_tracklist.append('div')
            .attr('class', 'list-song')

        song_container.append('text').attr('class', 'song-num')
            .text(i + 1)

        song_container.append('a')
            .attr('href', `./html/single_song.html?song=${t['english_name'].replace("'", '').replace('!',)}`)
            .style('color', t['song_art_text_color'])
            .text(t['english_name'])
            .style("font-weight", t['english_name'] == song['english_name'] ? "bold" : "normal")
            .on('click', (event, d) => {
                local_store_obj = { song: t, album: album, color_domain: color_domain, color_scale: color_scale };
                localStorage.setItem('data', JSON.stringify(local_store_obj))
            })
    }


    const credit_section = d3.select("#credit-section")
    credit_section.append('h3').text("Credits")
    const wrapper = credit_section.append('div').attr('id', 'credit-section-wrapper')
    for (let i = 0; i < song['custom_performances'].length; i++) {
        const element = song['custom_performances'][i]

        const indiv_credits = wrapper.append('div').attr('class', 'indiv-credits')
        indiv_credits.append('p').attr('class', 'credit-label').text(element['label'])

        var text = ''
        for (let a = 0; a < element['artists'].length; a++) {
            const artist = element['artists'][a]
            text += artist['name']
            if (a + 2 == element['artists'].length) {
                text += ' & '
            } else if (a + 1 != element['artists'].length) {
                text += ', '
            }
        }

        indiv_credits.append('p').attr('class', 'credit-name').text(text)
    }

}


function updateChart() {
    let selection = d3.select("#chart-select").property("value")
    console.log("selection:", selection)

    let paths = null
    let clickedMember = null


    let width = window.innerWidth / 2 - margin.left - margin.right - 200
    let height = width - margin.top - margin.bottom;

    d3.select("#chart-area").selectAll("svg").remove()
    d3.select("#song-area").html("")

    var svg = d3.select("#chart-area").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("style", "max-width: 100%; height: auto;");


    if (selection === "bar") {
        paths = renderBar(svg, svt_line_timing.timing, width, height, margin, color, color_domain)
        paths.on("click", function (event, d) {
            clickedMember = [d.member]
            console.log('clicked', clickedMember, selection)
            handleMemberClick(clickedMember, selection, false)
        })
    } else if (selection === "pie") {
        paths = renderPieChart(svg, svt_line_timing.timing, width, height, color)
        paths.on("click", function (event, d) {
            clickedMember = [d.data.member]
            console.log('clicked', clickedMember, selection)
            handleMemberClick(clickedMember, selection, false)
        })
    } else if (selection === "chord") {
        let matrix = Array.from({ length: members.length }, () => Array(members.length).fill(0))
        let directedCounts = new Map()

        const getChord = chordMatrix(data, matrix, directedCounts, members, song['english_name'])
        matrix = getChord['matrix']
        console.log("matrix", matrix)
        directedCounts = getChord['directedCounts']

        const tooltip = d3.select("#tooltip")
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

        renderChord(members, matrix, directedCounts, svg, tooltip, new_color_scale, width, height, margin, member_abr)
    }

    const lyricLines = renderLyrics(data, color, (lyric, event) => {
        if (selection === "chord") return
        const clickedMember = lyric.member;
        console.log("clicked lyric", clickedMember, selection);
        handleMemberClick(clickedMember, selection, false);
    })



    if (selectedMember.length != 0) {
        handleMemberClick(selectedMember, selection, true)
    }

}

d3.select("#chart-select").on("change", updateChart)
updateHeader()
updateChart()
updateFooter()

d3.select("body").on("click", (event) => {
    const target = event.target;

    // check if click was on lyric line or chart fragment
    if (!target.closest(".lyric-line") && !target.closest(".chart-fragment") && !target.closest(".chord-chart")) {
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
    console.log('svtSongData', svtSongData)

    let totalTime = 0
    for (let i = 0; i < data.length; i++) {
        const line = data[i]
        const members = line.member

        if (line.end == '' || line.start == '') {
            continue
        }

        const secs = timeToSeconds(line.end) - timeToSeconds(line.start)
        for (var j = 0; j < members.length; j++) {
            let member = members[j]
            let member_seconds = svtSongData.find(m => m.member === member);

            if (member_seconds) {
                member_seconds.seconds += secs
            } else {
                svtSongData.push({ member: member, seconds: secs })
                // console.log("add member", line)
            }
            totalTime += secs
        }
    }

    svtSongData = svtSongData.filter(d => d.seconds > 0 && d.member)
    // console.log(svtSongData)

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