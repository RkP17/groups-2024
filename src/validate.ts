import { PROTOTYPE_GROUPS_CATEGORY, SEPP_COURSE } from "./const";
import {
  CanvasGroup,
  getCourseGroups,
  getGroupMembers,
  GroupsById,
  GroupSpecification,
  readGroups,
} from "./groups";
import {
  cacheIdMapping,
  CourseStudents,
  getStudents,
  restoreIdMapping,
} from "./students";

let students: CourseStudents;
let prototypeGroups: GroupsById<CanvasGroup>;

async function validateExistingGroup(configGroup: GroupSpecification) {
  if (configGroup.id !== undefined) {
    const matchingGroup = prototypeGroups[configGroup.id];

    if (matchingGroup !== undefined) {
      console.log(
        `Group ${configGroup.name} exists as group ${configGroup.id} on Canvas.`
      );

      // Check that the name returned by Canvas matches what we have in the configuration.
      if (matchingGroup.name !== configGroup.name) {
        console.log(
          `Name needs to be changed from ${matchingGroup.name} to ${configGroup.name}`
        );

        // TODO: update name
      }

      // Check which members need to be added to the group, based on which students are
      // configured locally, but aren't members of the group on Canvas.
      const canvasMembers = await getGroupMembers(configGroup.id);
      // console.log(canvasMembers);

      configGroup.members.forEach((member) => {
        const canvasId = students.byId[member];

        if (canvasId === undefined) {
          console.error(`Unable to retrieve student matching ${member}`);
        } else {
          if (canvasMembers[canvasId] !== undefined) {
            console.log(
              `Student ${member} (${canvasId}) is a member of the group.`
            );
          } else {
            console.log(
              `Student ${member} (${canvasId}) is a member on Canvas, but not in the configuration file.`
            );
          }
        }
      });

      Object.keys(canvasMembers).forEach((canvasMember) => {
        const id = students.byCanvasId[Number.parseInt(canvasMember)];

        if (id === undefined) {
          console.error(`Unable to resolve id of ${canvasMember}`);
        } else {
          let found: boolean = false;

          configGroup.members.forEach((configMember) => {
            if (configMember === id) {
              found = true;
            }
          });

          if (!found) {
            console.log(
              `Student ${id} (${canvasMember}) needs to be removed from the group.`
            );
          }
        }
      });
    } else {
      console.error(
        `Group ${configGroup.name} has id ${configGroup.id}, which does not exist on Canvas.`
      );
    }
  } else {
    // create group
    console.log(`Group ${configGroup.name} does not exist yet.`);
  }
}

async function runWrapper() {
  const configGroups = await readGroups();
  console.log(
    `Found ${configGroups.length} group(s) in the local configuration file.`
  );

  students = await restoreIdMapping("config/students.json").catch(
    async (err) => {
      console.log(`Unable to restore student id mapping: ${err}`);

      console.log("Fetching students from Canvas...");
      const result = await getStudents(SEPP_COURSE);
      await cacheIdMapping("config/students.json", result);
      return result;
    }
  );
  const groups = await getCourseGroups(SEPP_COURSE);
  prototypeGroups = groups[PROTOTYPE_GROUPS_CATEGORY];
  console.log(
    `Found ${Object.keys(prototypeGroups).length} group(s) on Canvas.`
  );

  configGroups.forEach(validateExistingGroup);
}

runWrapper();