function buildNetworkData(tracks) {
    const nodes = new Map()
    const links = new Map()
    for (let track_i = 0; track_i < tracks.length; track_i++) {
        console.log(tracks[track_i])
        const lines = tracks[track_i]['synced_lyrics']

        for (let i = 0; i < lines.length - 1; i++) {
            const fromList = lines[i].member
            const toList = lines[i + 1].member

            for (let from_i = 0; from_i < fromList.length; from_i++) {
                for (let to_i = 0; to_i < toList.length; to_i++) {
                    const from = fromList[from_i]
                    const to = toList[to_i]
                    if (!from || !to || from === to || from == 'adlib' || to == 'adlib' || from == 'All' || to == 'All') continue

                    nodes.set(from, { id: from })
                    nodes.set(to, { id: to })

                    const key = `${from}->${to}`
                    links.set(key, {
                        source: from,
                        target: to,
                        value: (links.get(key)?.value || 0) + 1
                    })
                }
            }
        }

    }

    return {
        nodes: Array.from(nodes.values()),
        links: Array.from(links.values())
    }
}

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



var graph = []
d3.json('json/final_meta_data.json').then(function (data) {
    graph = buildNetworkData(data[0]['tracks'])
    console.log('graph', graph)

    const width = 1000
    const height = 800

    const svg = d3.select("#overview-body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)


    svg.append("defs")
        .append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999")


    const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink()                               // This force provides links between nodes
            .id(function (d) { return d.id; })                     // This provide  the id of a node
            .links(graph.links)
            .distance(400)                          // and this the list of links
        )

        // .force("link", d3.forceLink(graph.links)
        //     .id(d => d.id)
        //     .distance(120)
        //     .strength(0.6))
        .force("charge", d3.forceManyBody().strength(-600))         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
        .force("center", d3.forceCenter(width / 2, height / 2))     // This force attracts nodes to the center of the svg area
        .on("end", ticked);
    function ticked() {
        link
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        node
            .attr("cx", function (d) { return d.x + 6; })
            .attr("cy", function (d) { return d.y - 6; });
    }

    const link = svg.append("g")
        .selectAll("line")
        .data(graph.links)
        .join("line")
        .attr("stroke", "#aaa")
        .attr("stroke-width", d => Math.sqrt(d.value))
        .attr("marker-end", "url(#arrow)")


    const node = svg.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .join("g")
    // .call(d3.drag()
    //     .on("start", dragstarted)
    //     .on("drag", dragged)
    //     .on("end", dragended)
    // )

    node.append("circle")
        .attr("r", 40)
        .attr("fill", d => colorScale(d.id))

    node.append("text")
        .text(d => d.id)
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .attr("fill", "#fff")
        .style("font-size", "11px")


    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)

        node.attr("transform", d => `translate(${d.x}, ${d.y})`)
    })

})
// function dragstarted(event, d) {
//     if (!event.active) simulation.alphaTarget(0.3).restart()
//     d.fx = d.x
//     d.fy = d.y
// }

// function dragged(event, d) {
//     d.fx = event.x
//     d.fy = event.y
// }

// function dragended(event, d) {
//     if (!event.active) simulation.alphaTarget(0)
//     d.fx = null
//     d.fy = null
// }
