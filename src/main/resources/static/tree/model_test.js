import * as config from "./config.js";
import * as model from "./model.js";
import * as utils from "./utils.js";
if (config.test) {
    model.reset();
    const personId = await model.newPerson("name " + 1);
    const familyId = await model.newFamily();
    await model.attachParent(familyId, personId);
    // This output might be useful when debugging this test.
    // console.log("people:");
    // console.log(model.people);
    // console.log("families:");
    // console.log(model.families);
    console.assert(personId == 1);
    console.assert(model.people[personId].id == personId);
    console.assert(model.people[personId].names[0] == "name");
    console.assert(model.people[personId].names[1] == "1");
    console.assert(model.families[familyId].id == familyId);
    console.assert(utils.arraysEqual(model.parentOfFamilies(personId), [familyId]));
}
//# sourceMappingURL=model_test.js.map