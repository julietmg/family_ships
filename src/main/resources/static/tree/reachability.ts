import * as model from "./model.js";
import * as scc from "./scc.js";
// -------------------------- Reachability in the parent-child graph --------------------------

// TODO: This might be possible to speed up.
// * http://www.vldb.org/pvldb/vol7/p1191-wei.pdf
// * https://stackoverflow.com/questions/3755439/efficient-database-query-for-ancestors-on-an-acyclic-directed-graph
// * https://www.slideshare.net/slidarko/graph-windycitydb2010 (a.k.a. gremlins)
// * https://www3.cs.stonybrook.edu/~bender/pub/JALG05-daglca.pdf - but LCA might be too specific
function reachableRec(startId: model.PersonId, endSccIds: Set<scc.SccId>, visited: Set<model.PersonId>) {
    if (visited.has(startId)) {
        return false;
    }
    visited.add(startId);
    for (const childId of model.children(startId)) {
        if (endSccIds.has(scc.personsSccId[childId]) || reachableRec(childId, endSccIds, visited)) {
            return true;
        }
    }

    return false;
}

// Calculates whether any of the endIds are reachable from any of the startIds in the parent-child relationship graph.
export function isAnyReachableFrom(startIds: Array<model.PersonId>, endIds: Set<model.PersonId>): boolean {
    let visited: Set<model.PersonId> = new Set();
    let endSccIds: Set<scc.SccId> = new Set();
    for (const endPersonId of endIds) {
        endSccIds.add(scc.personsSccId[endPersonId]);
    }
    for (const personId of startIds) {
        if (reachableRec(personId, endSccIds, visited)) {
            return true;
        }
    }
    return false
}