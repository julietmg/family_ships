
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const treeData = {
    "name": "Julcia",
    "children": [
      {
        "name": "Franciszka"
      },
      {
        "name": "Marian",
        "children": [
          {
            "name": "Ewa"
          },
          {
            "name": "Jozek"
          }
        ]
      },
      {
        "name": "Krzysiu"
      },
      {
        "name": "Stefanek",
        "children": [
          {
            "name": "Ola",
          }
        ]
      },
      {
        "name": "Basia"
      }
    ]
  };

// set the dimensions and margins of the diagram
const margin = {top: 20, right: 90, bottom: 30, left: 90},
    width  = 660 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
const treemap = d3.tree().separation((a, b) => ((a.parent === b.parent) ? 1 : 0.5)).size([height, width]);

//  assigns the data to a hierarchy using parent-child relationships
let nodes = d3.hierarchy(treeData, d => d.children);

// maps the node data to the tree layout
nodes = treemap(nodes);

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
const svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom),
    g = svg.append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

// adds the links between the nodes
const link = g.selectAll(".link")
    .data( nodes.descendants().slice(1))
.enter().append("path")
    .attr("class", "link")
    .style("stroke", d => "grey")
    .attr("d", d => {
        return "M" + d.y + "," + d.x
        + "C" + (d.y + d.parent.y) / 2 + "," + d.x
        + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
        + " " + d.parent.y + "," + d.parent.x;
        });

// adds each node as a group
const node = g.selectAll(".node")
    .data(nodes.descendants())
    .enter().append("g")
    .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
    .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

// adds the circle to the node
node.append("circle")
.attr("r", d => 15)
.style("stroke", d => "black")
.style("fill", d => "grey");

// adds the text to the node
node.append("text")
.attr("dy", ".35em")
.attr("x", d => d.children ? (15 + 5) * -1 : 15 + 5)
.attr("y", d => d.children && d.depth !== 0 ? -(15 + 5) : d)
.style("text-anchor", d => d.children ? "end" : "start")
.text(d => d.data.name);

