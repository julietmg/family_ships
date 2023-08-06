import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const people = await fetch("/model/debug/people").then(data => data.json());
const families = await fetch("/model/debug/families").then(data => data.json());

let familiesDict = {};
for (let family of families) {
    familiesDict[family.id] = family;
}


let peoplesDict = {};
for (let person of people) {
    peoplesDict[person.id] = person;
}

console.log(familiesDict);
console.log(peoplesDict);

// set the dimensions and margins of the diagram
const margin = { top: 20, right: 90, bottom: 30, left: 90 },
    width = 660 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// declares a tree layout and assigns the size
const treemap = d3.cluster().separation((a, b) => ((a.parent === b.parent) ? 1 : 0.5)).size([height, width]);


// TODO: Find a nicer way to visualize this.
//  assigns the data to a hierarchy using parent-child relationships
let nodes = d3.hierarchy(people[4], person => 
        {
            let result = [];
            for (let familyParent of person.parentOfFamily) {
                let familyId = familyParent.id.familyId;
                let family = familiesDict[familyId];
                for (let familyChild of family.children) {
                    let childId = familyChild.id.childId;
                    result.push(peoplesDict[childId]);
                }
            }
            return result;
        }
    );


// maps the node data to the tree layout
nodes = treemap(nodes);

// TODO: Fix the layout to work also in case of cycles.
console.log(nodes);

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
    .data(nodes.descendants().slice(1))
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", d => "grey")
    .attr("d", d => {
        return "M" + d.y + "," + d.x
            + "C" + (d.y + d.parent.y) / 2 + "," + d.x
            + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
            + " " + d.parent.y + "," + d.parent.x;
    });

// TODO: Add buttons and interactivity.
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
    .attr("x", d => (15 + 5) * -1)
    .attr("y", d =>  -(15 + 5))
    .style("text-anchor", d => "end" )
    .text(d => d.data.formattedNames + " " + d.data.id);

