## 合并说明
- 源分支 → 目标分支：
- 改动摘要：

## 合 `.gitlab-ci.yml` 时（必读）
- **禁止**用源分支的 `.gitlab-ci.yml` 直接覆盖目标分支
- `dev → test`：冲突时 **保留 test 侧** `.gitlab-ci.yml`（否则不会推 `test-<SHA>`，部署会 manifest unknown）
- `test → master/main`：保留生产分支 CI；生产构建产出 `prod-<SHA>`
- 合并后看流水线：`validate-release-ci` 必须绿

## 检查清单
- [ ] 未错误覆盖 `.gitlab-ci.yml`
- [ ] Pipeline / validate-release-ci 通过
- [ ] 镜像 tag 前缀与环境一致（dev-/test-/prod-）
