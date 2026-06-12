import Group from "../models/Group.js";

export async function ensureDefaultGroup() {
  let group = await Group.findOne({ isDefault: true });

  if (!group) {
    group = await Group.create({
      name: "Nhóm chung",
      isDefault: true,
      createdBy: null,
      members: [],
    });
  }

  return group;
}
