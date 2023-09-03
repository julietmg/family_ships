import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as model from "./model.js";
import * as layout from "./layout.js";
// Replace "d3" with CDN version "https://cdn.jsdelivr.net/npm/d3@7/+esm" for the web version.
await model.reload();
layout.recalculate();
// set the dimensions and margins of the diagram
const margin = { top: 50, right: 90, bottom: 30, left: 130 }, width = 1000 + margin.left + margin.right, height = 800 + margin.top + margin.bottom;
// TODO: Infinite scrollable space.
// TODO: Elbows and symbols.
// TODO: Better visualization with buttons and everything.
// TODO: Nice way of handling people that are offline/logged out for some reason.
// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom), g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
let parentLinks = [];
for (const personId in model.people) {
    for (const familyId of model.parentOfFamilies(+personId)) {
        parentLinks.push([+personId, familyId]);
    }
}
// adds the links between the nodes
const partner = g.selectAll(".partner")
    .data(parentLinks)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", () => "blue")
    .attr("d", (d) => {
    const source = layout.personsPosition[d[0]];
    const target = layout.familyPosition[d[1]];
    return "M" + source.x + "," + source.y
        + " " + "L" + (source.x) + "," + (target.y)
        + " " + "M" + (source.x) + "," + (target.y)
        + " " + "L" + target.x + "," + target.y;
});
let childrenLinks = [];
for (const personId in model.people) {
    for (const familyId of model.childOfFamilies(+personId)) {
        childrenLinks.push([+personId, +familyId]);
    }
}
// adds the links between the nodes
const parent = g.selectAll(".parent")
    .data(childrenLinks)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", () => "grey")
    .attr("d", (d) => {
    const source = layout.personsPosition[d[0]];
    const target = layout.familyPosition[d[1]];
    const midHeight = (source.y + target.y) / 2;
    return "M" + source.x + "," + source.y
        + " " + "L" + (source.x) + "," + (midHeight)
        + " " + "M" + (source.x) + "," + (midHeight)
        + " " + "L" + (target.x) + "," + (midHeight)
        + " " + "M" + (target.x) + "," + (midHeight)
        + " " + "L" + target.x + "," + target.y;
});
let familyNodes = [];
for (const familyId in model.families) {
    familyNodes.push(+familyId);
    if (layout.familyPosition[familyId] == undefined) {
        layout.familyPosition[familyId] = { x: 10, y: 10 };
    }
}
// TODO: Add buttons and interactivity.
// adds each node as a group
const family = g.selectAll(".family")
    .data(familyNodes)
    .enter().append("g")
    .attr("class", () => "family")
    .attr("transform", (d) => {
    console.log(d);
    console.log(layout.familyPosition[+d]);
    return "translate(" + layout.familyPosition[+d].x + "," + layout.familyPosition[+d].y + ")";
})
    .on("click", async function (_event, d) {
    // TODO: Reload the graph after this finishes.
    // And preferably do it smoothly.
    // Also, block all the input for that period.
    // It's annoying, but it would work.
    console.log("Adding a child to " + d);
    let newPersonId = await fetch('/model/new_person', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'name': "child",
        })
    }).then(data => data.json());
    console.log(newPersonId);
    let addingChildResult = await fetch('/model/new_family_child', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'familyId': "" + d,
            'childId': newPersonId
        })
    }).then(data => data.json());
    console.log("Done");
});
// adds the circle to the family
family.append("circle")
    .attr("r", () => 5)
    .style("stroke", () => "red")
    .style("fill", () => "red");
let personNodes = [];
for (const personId in model.people) {
    personNodes.push(+personId);
}
// TODO: Add buttons and interactivity.
// adds each node as a group
const person = g.selectAll(".person")
    .data(personNodes)
    .enter().append("g")
    .attr("class", () => "person")
    .attr("transform", d => {
    return "translate(" + layout.personsPosition[+d].x + "," + layout.personsPosition[+d].y + ")";
});
// adds the circle to the person
person.append("circle")
    .attr("r", () => 15)
    .style("stroke", () => "black")
    .style("fill", () => "grey")
    .on("click", function (_event, d) {
    console.log("Clicked on circle of " + d);
});
// adds the text to the person
person.append("text")
    .attr("name", "textInput")
    .attr("dy", ".35em")
    .attr("x", () => (15 + 5) * -1)
    .attr("y", () => -(15 + 5))
    .style("text-anchor", () => "end")
    .text((d) => model.people[+d].formattedNames + " " + d)
    .on("click", function (_event, d) {
    // TODO: Erase debug in the production version
    console.log("Info about person: " + d);
    console.log(model.people[+d]);
    console.log("Parents:");
    console.log(model.parents(+d));
    console.log("Children:");
    console.log(model.children(+d));
    console.log("Partners:");
    console.log(model.partners(+d));
    console.log("Siblings:");
    console.log(model.siblings(+d));
    console.log("Parent of families:");
    console.log(model.parentOfFamilies(+d));
    console.log("Child of families:");
    console.log(model.childOfFamilies(+d));
    console.log("Position:");
    console.log(layout.personsPosition[+d]);
});
//# sourceMappingURL=tree.js.map