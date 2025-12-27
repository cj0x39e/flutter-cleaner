# Flutter Cleaner MVP 实现任务

## Step 1: 项目初始化
- [ ] 初始化 npm 项目
- [ ] 安装依赖 (commander, inquirer, chalk, ora, fs-extra)
- [ ] 安装开发依赖 (typescript, jest, ts-jest, @types/node, @types/fs-extra)
- [ ] 配置 TypeScript 编译
- [ ] 配置 Jest 测试框架
- [ ] 创建入口文件 `src/index.ts`

## Step 2: 文件工具
- [ ] 创建 `src/utils/FileUtils.ts`
- [ ] 实现 `exists()`, `isDirectory()`, `remove()`, `getSize()`, `readDir()`

## Step 3: 路径工具
- [ ] 创建 `src/utils/PathUtils.ts`
- [ ] 实现 `getProjectRoot()`, `resolveFlutterPaths()`, `resolveAndroidPaths()`, `resolveIOSPaths()`

## Step 4: 大小格式化工具
- [ ] 创建 `src/utils/SizeUtils.ts`
- [ ] 实现 `format(bytes)` 函数

## Step 5: 项目检测器
- [ ] 创建 `src/core/ProjectDetector.ts`
- [ ] 实现 `isFlutterProject()`, `hasAndroid()`, `hasIOS()`

## Step 6: 清理器基类
- [ ] 创建 `src/cleaners/BaseCleaner.ts`
- [ ] 定义 `CleanResult` 接口
- [ ] 实现通用扫描和清理逻辑

## Step 7: Flutter 清理器
- [ ] 创建 `src/cleaners/FlutterCleaner.ts`
- [ ] 清理 `build/`, `.dart_tool/`, `.flutter-plugins`, `.flutter-plugins-dependencies`

## Step 8: Android 清理器
- [ ] 创建 `src/cleaners/AndroidCleaner.ts`
- [ ] 清理 `android/build/`, `android/app/build/`, `android/.gradle/`

## Step 9: iOS 清理器
- [ ] 创建 `src/cleaners/IOSCleaner.ts`
- [ ] 清理 `ios/build/`, `ios/Pods/`, `ios/.symlinks/`, `ios/Flutter/*.framework`

## Step 10: 交互式 CLI
- [ ] 创建 `src/cli/InteractiveCLI.ts`
- [ ] 实现 `selectCleanLevel()`, `confirmClean()`, `displayResults()`
- [ ] 添加进度动画

## Step 11: 命令行入口
- [ ] 更新 `src/index.ts`
- [ ] 实现命令: `--fast`, `--standard`, `--dry-run`, `-p <path>`, `--help`

## Step 12: 配置管理
- [ ] 创建 `src/core/ConfigManager.ts`
- [ ] 实现 `loadConfig()`, `saveConfig()`, `getDefaultConfig()`
- [ ] 创建默认配置文件模板

## 验证
- [ ] 测试快速清理模式
- [ ] 测试标准清理模式
- [ ] 测试预览模式
- [ ] 测试错误处理

## 测试
- [ ] 配置 Jest 测试框架
- [ ] 编写 FileUtils 单元测试
- [ ] 编写 PathUtils 单元测试
- [ ] 编写 SizeUtils 单元测试
- [ ] 编写 ProjectDetector 单元测试
- [ ] 编写清理器单元测试
- [ ] 编写集成测试（完整清理流程）
- [ ] 运行所有测试并确保通过
