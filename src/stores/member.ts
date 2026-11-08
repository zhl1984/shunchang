import { readonly, ref, shallowRef } from "vue";
import { defineStore } from "pinia";

import {
  getMemberListApi,
  getWorkGroupListApi,
  type MemberRecordDto,
  type WorkGroupDto,
} from "@/api/member-management";
import { deepFilter } from "@/utils/tree";

type LoadStatus = "uninitialized" | "loading" | "initialized";

export interface MemberTreeMemberNode {
  /** 叶子节点不挂子树；字段仅用于满足树工具对 children 的类型约束。 */
  children?: readonly MemberTreeNode[];
  key: number;
  label: string;
  member: MemberRecordDto;
  nodeType: "member";
}

export interface MemberTreeGroupNode {
  children: MemberTreeMemberNode[];
  group: WorkGroupDto;
  key: number;
  label: string;
  nodeType: "group";
}

export type MemberTreeNode = MemberTreeGroupNode | MemberTreeMemberNode;

const PAGE_SIZE = 10000;
/** 标注员角色 ID，与成员管理角色映射保持一致。 */
const ANNOTATOR_ROLE_ID = 3;
/** 质检员角色 ID，与成员管理角色映射保持一致。 */
const QUALITY_ROLE_ID = 4;

/**
 * 按成员记录中的分组 ID 组合分组与成员树。
 * 空分组会保留；未分组或引用不存在分组的成员作为根级叶子节点保留。
 * @param members 完整成员集合。
 * @param groups 完整工作分组集合。
 * @returns 保持分组和成员原有顺序的两级关系树。
 */
export function buildMemberTree(
  members: MemberRecordDto[],
  groups: WorkGroupDto[],
): MemberTreeNode[] {
  const nodes = groups.map<MemberTreeGroupNode>((group) => ({
    children: [],
    group,
    key: group.id,
    label: group.groupName,
    nodeType: "group",
  }));
  const nodesByGroupId = new Map(
    nodes.map((node) => [node.group.id, node] as const),
  );
  const unassignedMembers: MemberTreeMemberNode[] = [];

  members.forEach((member) => {
    const memberNode: MemberTreeMemberNode = {
      key: member.id,
      label: member.userName,
      member,
      nodeType: "member",
    };
    const groupNode =
      member.workGroupId === null
        ? undefined
        : nodesByGroupId.get(member.workGroupId);

    // 无分组和失效分组引用均需保留，不能因关联数据异常丢失成员。
    if (!groupNode) {
      unassignedMembers.push(memberNode);
      return;
    }
    groupNode.children.push(memberNode);
  });

  return [...nodes, ...unassignedMembers];
}

/**
 * 基于完整成员树生成角色选择树。
 * 过滤条件按 deepFilter 保留规则实现：先剔除不满足角色的成员节点，再去掉没有剩余成员的分组。
 * @param tree 完整分组-成员关系树。
 * @param keepMember 成员节点是否保留；标注树排除 roleId !== 3，质检树排除 roleId !== 4。
 */
export function filterMemberTree(
  tree: readonly MemberTreeNode[],
  keepMember: (node: MemberTreeMemberNode) => boolean,
): MemberTreeNode[] {
  return deepFilter<MemberTreeNode>(tree, (node) => {
    if (node.nodeType === "member") {
      return keepMember(node);
    }

    // 分组在成员过滤后若已无叶子，则不再进入选择树。
    return (node.children?.length ?? 0) > 0;
  });
}

export const useMemberStore = defineStore("member", () => {
  const members = shallowRef<MemberRecordDto[]>([]);
  const groups = shallowRef<WorkGroupDto[]>([]);
  const tree = shallowRef<MemberTreeNode[]>([]);
  const annotatorTree = shallowRef<MemberTreeNode[]>([]);
  const qualityTree = shallowRef<MemberTreeNode[]>([]);
  const status = ref<LoadStatus>("uninitialized");
  let loadingPromise: Promise<void> | null = null;

  /** 一次性加载成员与工作分组，并合并并发初始化请求。 */
  function initialize(): Promise<void> {
    if (status.value === "initialized") return Promise.resolve();
    if (loadingPromise) return loadingPromise;

    status.value = "loading";
    loadingPromise = Promise.all([
      getMemberListApi({ pageNo: 1, pageSize: PAGE_SIZE }),
      getWorkGroupListApi(),
    ])
      .then(([memberResult, groupResult]) => {
        const nextMembers = memberResult.list ?? [];
        const nextGroups = groupResult ?? [];

        // 同一批接口结果整体替换原始集合和关系树，保证调用方读取一致快照。
        const nextTree = buildMemberTree(nextMembers, nextGroups);
        members.value = nextMembers;
        groups.value = nextGroups;
        tree.value = nextTree;
        // 标注树剔除 member && roleId !== 3；质检树剔除 member && roleId !== 4。
        annotatorTree.value = filterMemberTree(
          nextTree,
          (node) => node.member.roleId === ANNOTATOR_ROLE_ID,
        );
        qualityTree.value = filterMemberTree(
          nextTree,
          (node) => node.member.roleId === QUALITY_ROLE_ID,
        );
        status.value = "initialized";
      })
      .catch((error: unknown) => {
        // 加载失败后恢复初始状态，使页面或后续调用能够重新尝试。
        status.value = "uninitialized";
        throw error;
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  }

  /** CRUD 成功后整体刷新成员、分组、完整树和角色选择树，确保调用方数据一致。 */
  async function refresh(): Promise<void> {
    status.value = "uninitialized";
    await initialize();
  }

  // 获取 Store 即开始加载，调用方仍可通过 initialize 等待同一请求完成。
  void initialize().catch(() => undefined);
  return {
    members,
    groups,
    tree,
    annotatorTree,
    qualityTree,
    status: readonly(status),
    initialize,
    refresh,
  };
});
