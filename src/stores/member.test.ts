import { describe, expect, it } from "vitest";

import type { MemberRecordDto, WorkGroupDto } from "@/api/member-management";
import {
  buildMemberTree,
  filterMemberTree,
  type MemberTreeMemberNode,
} from "@/stores/member";

function createMember(
  overrides: Partial<MemberRecordDto> & Pick<MemberRecordDto, "id" | "roleId">,
): MemberRecordDto {
  return {
    email: `${overrides.id}@example.com`,
    loginName: `user-${overrides.id}`,
    phone: "13800000000",
    roleCode: `R${overrides.roleId}`,
    roleName: "role",
    userName: `成员${overrides.id}`,
    workGroupId: 1,
    workGroupName: "分组",
    ...overrides,
  };
}

function createGroup(
  overrides: Partial<WorkGroupDto> & Pick<WorkGroupDto, "id">,
): WorkGroupDto {
  return {
    description: "",
    groupName: `分组${overrides.id}`,
    groupType: "ANNOTATION",
    memberCount: 0,
    members: [],
    ...overrides,
  };
}

describe("filterMemberTree", () => {
  it("按成员角色过滤完整树，并去掉没有剩余成员的分组", () => {
    const tree = buildMemberTree(
      [
        createMember({ id: 11, roleId: 3, userName: "标注员", workGroupId: 1 }),
        createMember({ id: 12, roleId: 4, userName: "质检员", workGroupId: 1 }),
        createMember({ id: 13, roleId: 2, userName: "经理", workGroupId: 2 }),
        createMember({
          id: 14,
          roleId: 3,
          userName: "未分标注员",
          workGroupId: null,
        }),
      ],
      [createGroup({ id: 1, groupName: "混合组" }), createGroup({ id: 2 })],
    );

    const annotatorTree = filterMemberTree(
      tree,
      (node) => node.member.roleId === 3,
    );
    const qualityTree = filterMemberTree(
      tree,
      (node) => node.member.roleId === 4,
    );

    expect(
      annotatorTree.flatMap((node) =>
        node.nodeType === "member"
          ? [node.member.userName]
          : node.children.map((child: MemberTreeMemberNode) => child.label),
      ),
    ).toEqual(["标注员", "未分标注员"]);
    expect(annotatorTree).toHaveLength(2);
    expect(annotatorTree[0]).toMatchObject({
      label: "混合组",
      nodeType: "group",
    });
    expect(qualityTree).toEqual([
      expect.objectContaining({
        label: "混合组",
        children: [expect.objectContaining({ label: "质检员" })],
      }),
    ]);
  });
});
