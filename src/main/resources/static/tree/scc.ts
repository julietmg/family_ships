import * as model from "./model.js";

// -------------------------- Calculating strongly connected components of the parent-child graph --------------------------

export type SccId = number;
export let personsSccId: Record<number, SccId> = {};

export function recalculate() {
    // Reset the existing personsSccId.
    personsSccId = {}

    // This uses Tarjan's algorithm
    let sccs: Array<Array<number>> = [];
    let personsSccIdNum: Record<number, number> = {}
    let personsSccIdLow: Record<number, number> = {}
    let sccVisited = new Set();
    let sccProcessed = new Set();
    let sccCounter = 0;
    let sccStack: Array<number> = [];
    function sccRec(personId: number) {
        personsSccIdNum[personId] = sccCounter;
        personsSccIdLow[personId] = sccCounter;
        sccCounter += 1;
        sccVisited.add(personId);
        sccStack.push(personId);
        for (const childId of model.children(personId)) {
            if (!sccVisited.has(childId)) {
                sccRec(childId);
                personsSccIdLow[personId] = Math.min(personsSccIdLow[personId], personsSccIdLow[childId]);
            } else if (!sccProcessed.has(childId)) {
                personsSccIdLow[personId] = Math.min(personsSccIdLow[personId], personsSccIdNum[childId]);
            }
        }
        sccProcessed.add(personId);
        if (personsSccIdLow[personId] == personsSccIdNum[personId]) {
            let scc = [];
            let current = sccStack.pop();
            while (current != personId) {
                scc.push(current);
                current = sccStack.pop();
            }
            scc.push(current);
            sccs.push(scc);
        }
    }
    for (const personId in model.people) {
        if (sccVisited.has(+personId)) {
            continue;
        }
        sccRec(+personId);
    }

    for (let i = 0; i < sccs.length; i += 1) {
        const scc = sccs[i];
        for (const personId of scc) {
            personsSccId[personId] = i;
        }
    }
}





