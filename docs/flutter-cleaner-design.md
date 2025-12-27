# Flutter 项目清理工具设计文档

## 1. 项目概述

### 1.1 项目目标

开发一个命令行工具，用于清理 Flutter 项目中不再需要的缓存文件和构建产物，包括：

- Flutter 项目级缓存
- Android 构建缓存和依赖
- iOS 构建缓存和依赖
- 全局依赖缓存（可选）

### 1.2 核心理念

- **安全第一**：只清理可以重新生成的缓存和构建产物
- **分级清理**：提供不同级别的清理选项，让用户控制清理深度
- **交互友好**：提供清晰的提示和预览，避免误操作
- **可配置**：支持配置文件管理多个项目

### 1.3 技术栈

- **语言**：TypeScript
- **运行环境**：Node.js
- **主要依赖**：
  - `commander` - 命令行参数解析
  - `inquirer` - 交互式命令行界面
  - `chalk` - 终端文字颜色
  - `ora` - 加载动画
  - `fs-extra` - 文件系统操作
  - `yaml` - YAML 文件解析
  - `glob` - 文件匹配

---

## 2. 功能需求

### 2.1 核心功能

#### 2.1.1 Flutter 缓存清理

**目标**：清理 Flutter 项目级别的缓存和构建产物

**清理内容**：

- `.dart_tool/` - Dart 工具缓存
- `build/` - Flutter 构建产物
- `.flutter-plugins` - Flutter 插件列表
- `.flutter-plugins-dependencies` - 插件依赖关系
- `.packages` - 旧版包引用文件（如果存在）

**依据**：

- 读取 `pubspec.yaml` 和 `pubspec.lock`（仅作为参考）
- 不分析代码中的依赖使用情况
- 只要在配置文件中声明的依赖，就视为需要保留

#### 2.1.2 Android 缓存清理

**目标**：清理 Android 构建缓存和 Gradle 缓存

**清理内容**：

**项目级缓存**：

- `android/build/` - 项目构建产物
- `android/app/build/` - 应用模块构建产物
- `android/.gradle/` - 项目 Gradle 缓存
- `android/.idea/` - Android Studio 配置（可选）

**全局缓存**（需用户确认）：

- `~/.gradle/caches/` - Gradle 全局缓存

**保留内容**：

- `android/gradle/wrapper/` - Gradle wrapper
- `android/local.properties` - 本地配置
- `android/app/src/` - 源代码
- `android/build.gradle` - 构建配置
- `android/settings.gradle` - 项目设置

#### 2.1.3 iOS 缓存清理

**目标**：清理 iOS 构建缓存和 CocoaPods 依赖

**清理内容**：

**项目级缓存**：

- `ios/Pods/` - 已安装的 Pods
- `ios/build/` - Xcode 构建产物
- `ios/.symlinks/` - Flutter 插件符号链接
- `ios/Flutter/Flutter.framework` - Flutter 框架（可重新生成）
- `ios/Flutter/App.framework` - 应用框架（可重新生成）

**全局缓存**（需用户确认）：

- `~/Library/Caches/CocoaPods/` - CocoaPods 全局缓存
- `~/Library/Developer/Xcode/DerivedData/` - Xcode 派生数据

**保留内容**：

- `ios/Podfile` - CocoaPods 配置
- `ios/Podfile.lock` - 依赖锁定文件
- `ios/Runner/` - 源代码目录
- `ios/Runner.xcodeproj/` - Xcode 项目文件
- `ios/Runner.xcworkspace/` - Xcode workspace

#### 2.1.4 全局 Pub 缓存清理

**目标**：清理未被任何配置项目使用的 Pub 包

**缓存位置**：

- macOS/Linux: `~/.pub-cache/`
- Windows: `%APPDATA%\Pub\Cache\`

**清理策略**：

1. 扫描配置文件中所有项目的 `pubspec.lock`
2. 收集所有项目使用的包和版本
3. 标记 `~/.pub-cache/hosted/` 中未被使用的包版本
4. 提供清理选项（需要用户明确确认）

**注意事项**：

- 风险较高，默认不启用
- 可能影响其他未配置的项目
- 建议仅在确定所有项目都已配置后使用

### 2.2 辅助功能

#### 2.2.1 空间分析

- 扫描各个缓存目录的大小
- 显示清理前后的空间占用
- 提供详细的空间分布报告

#### 2.2.2 预览模式

- 显示将要删除的文件和目录
- 计算预计释放的空间
- 不执行实际删除操作

#### 2.2.3 报告生成

- 生成 JSON 格式的清理报告
- 可选生成 Markdown 格式的可读报告
- 记录清理的时间、项目、删除的内容、释放的空间

#### 2.2.4 恢复建议

清理后提供恢复依赖的命令建议：

```bash
# Flutter 依赖
flutter pub get

# iOS 依赖（如果清理了 Pods）
cd ios && pod install

# Android 依赖（通常自动处理）
flutter build apk --debug
```

---

## 3. 清理级别设计

### 3.1 Level 1: 快速清理（Fast）

**适用场景**：日常开发，快速释放空间

**清理内容**：

```
Flutter:
  ✓ build/
  ✓ .dart_tool/package_config.json

Android:
  ✓ android/build/
  ✓ android/app/build/

iOS:
  ✓ ios/build/
```

**预计释放空间**：几十 MB 到几百 MB

**风险等级**：⭐ 最安全

**恢复成本**：低（下次构建自动恢复）

### 3.2 Level 2: 标准清理（Standard）

**适用场景**：版本切换、依赖更新后、定期清理

**清理内容**：

```
Flutter:
  ✓ build/
  ✓ .dart_tool/
  ✓ .flutter-plugins
  ✓ .flutter-plugins-dependencies

Android:
  ✓ android/build/
  ✓ android/app/build/
  ✓ android/.gradle/
  ✓ android/.idea/ (可选)

iOS:
  ✓ ios/build/
  ✓ ios/Pods/
  ✓ ios/.symlinks/
  ✓ ios/Flutter/*.framework
```

**预计释放空间**：几百 MB 到几 GB

**风险等级**：⭐⭐ 安全（可能需要重新下载依赖）

**恢复成本**：中（需要运行 `flutter pub get` 和 `pod install`）

### 3.3 Level 3: 深度清理（Deep）

**适用场景**：磁盘空间紧张、清理无用的全局缓存

**清理内容**：

```
Standard 级别的所有内容，加上：

全局缓存:
  ✓ ~/.gradle/caches/ (未使用部分)
  ✓ ~/Library/Caches/CocoaPods/
  ✓ ~/.pub-cache/ (未使用的包版本)
```

**预计释放空间**：几 GB 到十几 GB

**风险等级**：⭐⭐⭐ 需要谨慎（可能影响其他项目）

**恢复成本**：高（需要重新下载所有依赖）

**特别提示**：

- 需要用户二次确认
- 建议在清理前备份重要数据
- 可能影响配置外的其他项目

---

## 4. 系统架构设计

### 4.1 模块划分

```
flutter-cleaner/
├── src/
│   ├── core/
│   │   ├── ConfigManager.ts          # 配置管理
│   │   ├── ProjectDetector.ts        # 项目检测
│   │   ├── DependencyReader.ts       # 依赖读取
│   │   └── SpaceAnalyzer.ts          # 空间分析
│   ├── cleaners/
│   │   ├── BaseCleaner.ts            # 清理基类
│   │   ├── FlutterCleaner.ts         # Flutter 清理器
│   │   ├── AndroidCleaner.ts         # Android 清理器
│   │   ├── IOSCleaner.ts             # iOS 清理器
│   │   └── GlobalCacheCleaner.ts     # 全局缓存清理器
│   ├── cli/
│   │   ├── CommandHandler.ts         # 命令处理
│   │   ├── InteractiveCLI.ts         # 交互界面
│   │   └── ProgressDisplay.ts        # 进度显示
│   ├── utils/
│   │   ├── FileUtils.ts              # 文件工具
│   │   ├── PathUtils.ts              # 路径工具
│   │   ├── SizeUtils.ts              # 大小计算
│   │   └── Logger.ts                 # 日志工具
│   ├── reporters/
│   │   ├── JSONReporter.ts           # JSON 报告
│   │   └── MarkdownReporter.ts       # Markdown 报告
│   └── index.ts                      # 入口文件
├── config/
│   └── default-config.json           # 默认配置
├── tests/                            # 测试文件
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 核心类设计

#### 4.2.1 ConfigManager

```typescript
interface Config {
  version: string;
  projects: ProjectConfig[];
  cleanOptions: CleanOptions;
  safeMode: boolean;
  backupBeforeClean: boolean;
  showSizeBefore: boolean;
}

interface ProjectConfig {
  name: string;
  path: string;
  enabled: boolean;
}

interface CleanOptions {
  flutter: FlutterCleanOptions;
  android: AndroidCleanOptions;
  ios: IOSCleanOptions;
}

class ConfigManager {
  loadConfig(path: string): Config;
  saveConfig(config: Config, path: string): void;
  validateConfig(config: Config): boolean;
  getDefaultConfig(): Config;
}
```

#### 4.2.2 ProjectDetector

```typescript
interface ProjectInfo {
  path: string;
  isFlutterProject: boolean;
  hasAndroid: boolean;
  hasIOS: boolean;
  hasWeb: boolean;
  pubspecPath: string;
  lockFilePath: string;
}

class ProjectDetector {
  detectProject(path: string): ProjectInfo;
  isValidFlutterProject(path: string): boolean;
  findFlutterProjects(rootPath: string): ProjectInfo[];
}
```

#### 4.2.3 DependencyReader

```typescript
interface PubspecData {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface LockFileData {
  packages: Record<string, PackageInfo>;
}

class DependencyReader {
  readPubspec(path: string): PubspecData;
  readLockFile(path: string): LockFileData;
  getAllDependencies(projectPath: string): string[];
}
```

#### 4.2.4 BaseCleaner

```typescript
interface CleanResult {
  success: boolean;
  deletedPaths: string[];
  freedSpace: number;
  errors: Error[];
}

abstract class BaseCleaner {
  abstract scan(projectPath: string): string[];
  abstract clean(paths: string[]): CleanResult;
  calculateSize(paths: string[]): number;
  validatePaths(paths: string[]): boolean;
}
```

#### 4.2.5 FlutterCleaner

```typescript
interface FlutterCleanOptions {
  build: boolean;
  dartTool: boolean;
  pluginFiles: boolean;
}

class FlutterCleaner extends BaseCleaner {
  constructor(options: FlutterCleanOptions);
  scan(projectPath: string): string[];
  clean(paths: string[]): CleanResult;
}
```

#### 4.2.6 InteractiveCLI

```typescript
enum CleanLevel {
  Fast = "fast",
  Standard = "standard",
  Deep = "deep",
}

class InteractiveCLI {
  selectCleanLevel(): Promise<CleanLevel>;
  selectProjects(projects: ProjectInfo[]): Promise<ProjectInfo[]>;
  confirmClean(paths: string[], size: number): Promise<boolean>;
  displayResults(result: CleanResult): void;
}
```

---

## 5. 配置文件设计

### 5.1 配置文件格式

文件名：`.flutter-cleaner.json` 或 `flutter-cleaner.config.json`

```json
{
  "version": "1.0",
  "projects": [
    {
      "name": "my-flutter-app",
      "path": "/Users/username/projects/my-flutter-app",
      "enabled": true
    },
    {
      "name": "another-app",
      "path": "/Users/username/projects/another-app",
      "enabled": false
    }
  ],
  "cleanOptions": {
    "flutter": {
      "build": true,
      "dartTool": true,
      "pluginFiles": true
    },
    "android": {
      "build": true,
      "gradle": true,
      "idea": false,
      "globalCache": false
    },
    "ios": {
      "build": true,
      "pods": true,
      "symlinks": true,
      "frameworks": true,
      "globalCache": false
    }
  },
  "safeMode": true,
  "backupBeforeClean": false,
  "showSizeBefore": true,
  "excludePaths": ["**/*.lock", "**/local.properties"]
}
```

### 5.2 配置项说明

| 配置项                           | 类型    | 默认值 | 说明                       |
| -------------------------------- | ------- | ------ | -------------------------- |
| version                          | string  | "1.0"  | 配置文件版本               |
| projects                         | array   | []     | 项目列表                   |
| projects[].name                  | string  | -      | 项目名称                   |
| projects[].path                  | string  | -      | 项目绝对路径               |
| projects[].enabled               | boolean | true   | 是否启用此项目             |
| cleanOptions.flutter.build       | boolean | true   | 清理 build 目录            |
| cleanOptions.flutter.dartTool    | boolean | true   | 清理 .dart_tool            |
| cleanOptions.flutter.pluginFiles | boolean | true   | 清理插件配置文件           |
| cleanOptions.android.build       | boolean | true   | 清理 Android build         |
| cleanOptions.android.gradle      | boolean | true   | 清理 Gradle 缓存           |
| cleanOptions.android.idea        | boolean | false  | 清理 IDEA 配置             |
| cleanOptions.android.globalCache | boolean | false  | 清理全局 Gradle 缓存       |
| cleanOptions.ios.build           | boolean | true   | 清理 iOS build             |
| cleanOptions.ios.pods            | boolean | true   | 清理 Pods                  |
| cleanOptions.ios.symlinks        | boolean | true   | 清理符号链接               |
| cleanOptions.ios.frameworks      | boolean | true   | 清理 frameworks            |
| cleanOptions.ios.globalCache     | boolean | false  | 清理 CocoaPods 全局缓存    |
| safeMode                         | boolean | true   | 安全模式（删除前二次确认） |
| backupBeforeClean                | boolean | false  | 清理前备份                 |
| showSizeBefore                   | boolean | true   | 显示清理前的大小           |
| excludePaths                     | array   | []     | 排除路径模式               |

---

## 6. 命令行接口设计

### 6.1 基本命令

```bash
# 交互式清理（默认行为）
flutter-cleaner

# 显示帮助信息
flutter-cleaner --help
flutter-cleaner -h

# 显示版本信息
flutter-cleaner --version
flutter-cleaner -v
```

### 6.2 清理命令

```bash
# 快速清理
flutter-cleaner --fast
flutter-cleaner -f

# 标准清理
flutter-cleaner --standard
flutter-cleaner -s

# 深度清理
flutter-cleaner --deep
flutter-cleaner -d

# 只清理特定平台
flutter-cleaner --flutter-only
flutter-cleaner --android-only
flutter-cleaner --ios-only

# 组合清理
flutter-cleaner --flutter --android
```

### 6.3 项目管理

```bash
# 指定项目路径
flutter-cleaner --project /path/to/project
flutter-cleaner -p /path/to/project

# 使用配置文件
flutter-cleaner --config ./custom-config.json
flutter-cleaner -c ./custom-config.json

# 清理配置文件中的所有项目
flutter-cleaner --all

# 清理特定项目（按名称）
flutter-cleaner --project-name my-app
```

### 6.4 分析和预览

```bash
# 分析可清理空间（不执行清理）
flutter-cleaner --analyze
flutter-cleaner -a

# 预览模式（显示将要删除的内容）
flutter-cleaner --dry-run
flutter-cleaner --preview

# 显示详细信息
flutter-cleaner --verbose
```

### 6.5 配置管理

```bash
# 初始化配置文件
flutter-cleaner init

# 添加项目到配置
flutter-cleaner add-project /path/to/project

# 列出配置的项目
flutter-cleaner list-projects

# 移除项目
flutter-cleaner remove-project my-app
```

### 6.6 清理后操作

```bash
# 清理后自动恢复依赖
flutter-cleaner --standard --restore

# 自动运行的命令：
# - flutter pub get
# - pod install (如果清理了 iOS)
# - 可选：flutter build (重建缓存)
```

### 6.7 报告生成

```bash
# 生成 JSON 报告
flutter-cleaner --report report.json

# 生成 Markdown 报告
flutter-cleaner --report report.md

# 静默模式（适用于 CI/CD）
flutter-cleaner --silent --report report.json
```

### 6.8 全局缓存管理

```bash
# 分析全局缓存
flutter-cleaner --analyze-global

# 清理全局 pub-cache
flutter-cleaner --clean-pub-cache

# 清理全局 Gradle 缓存
flutter-cleaner --clean-gradle-cache

# 清理全局 CocoaPods 缓存
flutter-cleaner --clean-pods-cache
```

---

## 7. 工作流程

### 7.1 主流程

```
┌─────────────────────────┐
│   启动 flutter-cleaner  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  解析命令行参数          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  读取/初始化配置文件     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  检测项目               │
│  - 当前目录             │
│  - 配置文件中的项目     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  项目类型检测           │
│  - Flutter 项目？       │
│  - 包含 Android？       │
│  - 包含 iOS？           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  选择清理级别           │
│  - Fast                 │
│  - Standard             │
│  - Deep                 │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  扫描可清理内容         │
│  - Flutter 缓存         │
│  - Android 缓存         │
│  - iOS 缓存             │
│  - 全局缓存（可选）     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  计算空间占用           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  展示清理预览           │
│  - 将要删除的目录       │
│  - 预计释放空间         │
│  - 风险提示             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  用户确认               │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  执行清理               │
│  - 显示进度条           │
│  - 逐个删除             │
│  - 记录错误             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  显示清理结果           │
│  - 成功删除的内容       │
│  - 释放的空间           │
│  - 错误信息（如有）     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  恢复建议               │
│  - flutter pub get      │
│  - pod install          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  生成报告（可选）       │
└─────────────────────────┘
```

### 7.2 交互式清理流程

```typescript
async function interactiveClean() {
  // 1. 检测项目
  const projects = await detectProjects();

  // 2. 选择项目（如果有多个）
  const selectedProjects = await selectProjects(projects);

  // 3. 选择清理级别
  const level = await selectCleanLevel();

  // 4. 扫描可清理内容
  const cleanTargets = await scanCleanTargets(selectedProjects, level);

  // 5. 计算空间
  const totalSize = calculateTotalSize(cleanTargets);

  // 6. 显示预览
  displayPreview(cleanTargets, totalSize);

  // 7. 确认
  const confirmed = await confirmClean();

  if (!confirmed) {
    console.log("清理已取消");
    return;
  }

  // 8. 执行清理
  const result = await executeClean(cleanTargets);

  // 9. 显示结果
  displayResult(result);

  // 10. 恢复建议
  displayRestoreInstructions(result);

  // 11. 生成报告（可选）
  if (shouldGenerateReport()) {
    await generateReport(result);
  }
}
```

---

## 8. 安全机制

### 8.1 白名单保护

**永不删除的文件和目录**：

```typescript
const PROTECTED_FILES = [
  // Flutter
  "pubspec.yaml",
  "pubspec.lock",
  "analysis_options.yaml",

  // Android
  "android/build.gradle",
  "android/settings.gradle",
  "android/gradle.properties",
  "android/local.properties",
  "android/gradle/wrapper/**",
  "android/app/src/**",

  // iOS
  "ios/Podfile",
  "ios/Podfile.lock",
  "ios/Runner/**",
  "ios/*.xcodeproj/**",
  "ios/*.xcworkspace/**",

  // Git
  ".git/**",
  ".gitignore",

  // 源代码
  "lib/**",
  "test/**",
  "assets/**",

  // 配置文件
  ".flutter-cleaner.json",
  "flutter-cleaner.config.json",
];
```

### 8.2 确认机制

#### 8.2.1 标准清理确认

```
⚠️  准备清理以下内容：

Flutter:
  ✓ build/ (45.2 MB)
  ✓ .dart_tool/ (12.8 MB)

Android:
  ✓ android/build/ (128.5 MB)
  ✓ android/app/build/ (89.3 MB)
  ✓ android/.gradle/ (234.7 MB)

iOS:
  ✓ ios/build/ (156.8 MB)
  ✓ ios/Pods/ (445.2 MB)

预计释放空间: 1.1 GB

? 确认执行清理？(y/N)
```

#### 8.2.2 深度清理确认

```
⚠️  警告：深度清理将删除全局缓存！

这将影响以下内容：
  • ~/.gradle/caches/ (2.3 GB)
  • ~/Library/Caches/CocoaPods/ (1.8 GB)
  • ~/.pub-cache/ 中未使用的包 (456 MB)

预计释放空间: 4.6 GB

⚠️  这可能影响其他未配置的项目！
⚠️  清理后需要重新下载所有依赖！

? 请输入项目名称以确认: ___________

? 确认执行深度清理？(y/N)
```

### 8.3 错误处理

```typescript
interface CleanError {
  path: string;
  error: Error;
  severity: "warning" | "error";
}

class ErrorHandler {
  private errors: CleanError[] = [];

  handleError(path: string, error: Error, severity: "warning" | "error") {
    this.errors.push({ path, error, severity });

    if (severity === "error") {
      logger.error(`无法删除 ${path}: ${error.message}`);
    } else {
      logger.warn(`警告: ${path} - ${error.message}`);
    }
  }

  getErrorSummary(): string {
    const errorCount = this.errors.filter((e) => e.severity === "error").length;
    const warningCount = this.errors.filter(
      (e) => e.severity === "warning"
    ).length;

    return `完成清理，${errorCount} 个错误，${warningCount} 个警告`;
  }
}
```

### 8.4 回退机制

虽然不提供自动备份，但提供清晰的恢复指令：

```typescript
function displayRestoreInstructions(result: CleanResult) {
  console.log("\n📋 恢复依赖指令：\n");

  if (result.cleanedFlutter) {
    console.log("1. 恢复 Flutter 依赖：");
    console.log("   $ flutter pub get\n");
  }

  if (result.cleanedIOS) {
    console.log("2. 恢复 iOS 依赖：");
    console.log("   $ cd ios && pod install && cd ..\n");
  }

  if (result.cleanedAndroid) {
    console.log("3. Android 依赖将在下次构建时自动恢复\n");
  }

  console.log("💡 提示：运行以下命令验证项目状态：");
  console.log("   $ flutter doctor");
  console.log("   $ flutter run");
}
```

---

## 9. 报告格式

### 9.1 JSON 报告

```json
{
  "timestamp": "2024-12-27T10:30:00Z",
  "version": "1.0.0",
  "cleanLevel": "standard",
  "projects": [
    {
      "name": "my-flutter-app",
      "path": "/path/to/project",
      "results": {
        "flutter": {
          "deleted": ["build/", ".dart_tool/"],
          "freedSpace": 58060800,
          "errors": []
        },
        "android": {
          "deleted": [
            "android/build/",
            "android/app/build/",
            "android/.gradle/"
          ],
          "freedSpace": 469762048,
          "errors": []
        },
        "ios": {
          "deleted": ["ios/build/", "ios/Pods/"],
          "freedSpace": 631242752,
          "errors": []
        }
      },
      "totalFreedSpace": 1159065600,
      "duration": 15.234
    }
  ],
  "summary": {
    "totalProjects": 1,
    "totalFreedSpace": 1159065600,
    "totalDuration": 15.234,
    "successCount": 1,
    "errorCount": 0
  }
}
```

### 9.2 Markdown 报告

````markdown
# Flutter 清理报告

**生成时间**: 2024-12-27 10:30:00
**清理级别**: 标准清理
**工具版本**: 1.0.0

---

## 项目: my-flutter-app

**路径**: `/path/to/project`
**耗时**: 15.23 秒

### Flutter 清理

| 删除内容    | 大小    |
| ----------- | ------- |
| build/      | 45.2 MB |
| .dart_tool/ | 12.8 MB |

**小计**: 58.0 MB

### Android 清理

| 删除内容           | 大小     |
| ------------------ | -------- |
| android/build/     | 128.5 MB |
| android/app/build/ | 89.3 MB  |
| android/.gradle/   | 234.7 MB |

**小计**: 452.5 MB

### iOS 清理

| 删除内容   | 大小     |
| ---------- | -------- |
| ios/build/ | 156.8 MB |
| ios/Pods/  | 445.2 MB |

**小计**: 602.0 MB

---

## 总结

- **释放空间总计**: 1.1 GB
- **清理项目数**: 1
- **成功**: 1
- **失败**: 0

## 恢复指令

```bash
# 恢复 Flutter 依赖
flutter pub get

# 恢复 iOS 依赖
cd ios && pod install

# Android 依赖将在下次构建时自动恢复
```
````

````

---

## 10. 实现优先级

### 10.1 第一版（MVP）- 核心功能

**目标**：实现基本的项目缓存清理功能

**功能列表**：
1. ✅ Flutter 项目检测
2. ✅ Flutter 缓存清理（build、.dart_tool、插件文件）
3. ✅ Android 项目缓存清理（build、gradle）
4. ✅ iOS 项目缓存清理（build、Pods）
5. ✅ 快速和标准两个清理级别
6. ✅ 交互式命令行界面
7. ✅ 空间计算和显示
8. ✅ 预览模式（--dry-run）
9. ✅ 基本的错误处理

**预计开发时间**: 1-2 周

### 10.2 第二版 - 配置和多项目

**目标**：支持配置文件和多项目管理

**功能列表**：
1. ✅ JSON 配置文件支持
2. ✅ 配置文件初始化（init 命令）
3. ✅ 多项目配置和管理
4. ✅ 项目添加/删除命令
5. ✅ 深度清理级别
6. ✅ 全局缓存清理（pub-cache、Gradle、CocoaPods）
7. ✅ 报告生成（JSON 和 Markdown）
8. ✅ 详细日志模式

**预计开发时间**: 1-2 周

### 10.3 第三版 - 高级特性

**目标**：提供更多便利功能和自动化

**功能列表**：
1. ✅ 自动恢复功能（--restore）
2. ✅ 静默模式（适用于 CI/CD）
3. ✅ 定时清理任务
4. ✅ 清理策略预设
5. ✅ 更详细的空间分析
6. ✅ 清理历史记录
7. ✅ 性能优化（并行清理）
8. ✅ 插件系统（支持自定义清理器）

**预计开发时间**: 2-3 周

---

## 11. 技术实现要点

### 11.1 跨平台支持

```typescript
import * as os from 'os';
import * as path from 'path';

class PathResolver {
  // 获取用户主目录
  static getHomeDir(): string {
    return os.homedir();
  }

  // 获取 pub-cache 路径
  static getPubCachePath(): string {
    if (process.platform === 'win32') {
      return path.join(process.env.APPDATA || '', 'Pub', 'Cache');
    }
    return path.join(this.getHomeDir(), '.pub-cache');
  }

  // 获取 Gradle 缓存路径
  static getGradleCachePath(): string {
    return path.join(this.getHomeDir(), '.gradle', 'caches');
  }

  // 获取 CocoaPods 缓存路径
  static getCocoapodsCachePath(): string {
    if (process.platform === 'darwin') {
      return path.join(this.getHomeDir(), 'Library', 'Caches', 'CocoaPods');
    }
    throw new Error('CocoaPods 仅支持 macOS');
  }
}
````

### 11.2 安全删除

```typescript
import * as fs from "fs-extra";

class SafeDeleter {
  private protectedPatterns: string[];

  constructor(protectedPatterns: string[]) {
    this.protectedPatterns = protectedPatterns;
  }

  async deleteSafely(targetPath: string): Promise<void> {
    // 检查是否在保护列表中
    if (this.isProtected(targetPath)) {
      throw new Error(`路径受保护，不能删除: ${targetPath}`);
    }

    // 检查路径是否存在
    if (!(await fs.pathExists(targetPath))) {
      throw new Error(`路径不存在: ${targetPath}`);
    }

    // 执行删除
    try {
      await fs.remove(targetPath);
    } catch (error) {
      throw new Error(`删除失败: ${error.message}`);
    }
  }

  private isProtected(targetPath: string): boolean {
    // 使用 glob 模式匹配检查
    return this.protectedPatterns.some((pattern) => {
      // 实现模式匹配逻辑
      return matchPattern(targetPath, pattern);
    });
  }
}
```

### 11.3 空间计算

```typescript
import * as fs from "fs";
import * as path from "path";

class SizeCalculator {
  async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        totalSize += await this.calculateDirectorySize(itemPath);
      } else if (item.isFile()) {
        const stats = await fs.promises.stat(itemPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  formatSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
```

### 11.4 进度显示

```typescript
import ora from "ora";
import chalk from "chalk";

class ProgressDisplay {
  private spinner: ora.Ora;

  start(message: string) {
    this.spinner = ora(message).start();
  }

  update(message: string) {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeed(message: string) {
    if (this.spinner) {
      this.spinner.succeed(chalk.green(message));
    }
  }

  fail(message: string) {
    if (this.spinner) {
      this.spinner.fail(chalk.red(message));
    }
  }

  info(message: string) {
    console.log(chalk.blue("ℹ"), message);
  }

  warn(message: string) {
    console.log(chalk.yellow("⚠"), message);
  }

  error(message: string) {
    console.log(chalk.red("✖"), message);
  }
}
```

---

## 12. 测试策略

### 12.1 单元测试

```typescript
describe("FlutterCleaner", () => {
  it("应该正确扫描 Flutter 缓存目录", async () => {
    const cleaner = new FlutterCleaner({
      build: true,
      dartTool: true,
      pluginFiles: true,
    });

    const paths = await cleaner.scan("/test/project");

    expect(paths).toContain("/test/project/build");
    expect(paths).toContain("/test/project/.dart_tool");
  });

  it("应该计算正确的目录大小", async () => {
    const calculator = new SizeCalculator();
    const size = await calculator.calculateDirectorySize("/test/project/build");

    expect(size).toBeGreaterThan(0);
  });

  it("应该保护重要文件不被删除", () => {
    const deleter = new SafeDeleter(PROTECTED_FILES);

    expect(() => {
      deleter.deleteSafely("/project/pubspec.yaml");
    }).toThrow();
  });
});
```

### 12.2 集成测试

```typescript
describe("清理流程集成测试", () => {
  it("应该完成完整的标准清理流程", async () => {
    // 1. 创建测试项目
    const testProject = await createTestProject();

    // 2. 执行清理
    const result = await executeClean(testProject.path, CleanLevel.Standard);

    // 3. 验证结果
    expect(result.success).toBe(true);
    expect(result.freedSpace).toBeGreaterThan(0);

    // 4. 验证文件已删除
    expect(fs.existsSync(path.join(testProject.path, "build"))).toBe(false);
    expect(fs.existsSync(path.join(testProject.path, ".dart_tool"))).toBe(
      false
    );

    // 5. 验证保护文件仍然存在
    expect(fs.existsSync(path.join(testProject.path, "pubspec.yaml"))).toBe(
      true
    );

    // 6. 清理测试项目
    await cleanupTestProject(testProject);
  });
});
```

### 12.3 端到端测试

使用真实的 Flutter 项目进行测试：

1. 创建真实的 Flutter 项目
2. 执行 `flutter pub get` 和 `flutter build`
3. 运行清理工具
4. 验证清理结果
5. 执行 `flutter pub get` 恢复
6. 验证项目仍可正常运行

---

## 13. 文档和发布

### 13.1 README 文档

````markdown
# Flutter Cleaner

一个强大的 Flutter 项目缓存清理工具

## 特性

✨ 支持多级清理策略（快速/标准/深度）
🎯 智能识别 Flutter 项目结构
🔒 安全机制，保护重要文件
📊 详细的空间分析和报告
⚙️ 灵活的配置文件
🚀 交互式命令行界面

## 安装

```bash
npm install -g flutter-cleaner
```
````

## 快速开始

```bash
# 在 Flutter 项目目录下运行
flutter-cleaner

# 或指定项目路径
flutter-cleaner --project /path/to/project
```

## 使用文档

[详细文档链接]

```

### 13.2 发布清单

**NPM 发布准备**：
- [ ] 完善 package.json
- [ ] 编写 README.md
- [ ] 添加 LICENSE
- [ ] 编写 CHANGELOG.md
- [ ] 设置 .npmignore
- [ ] 配置 TypeScript 编译
- [ ] 测试 npm pack
- [ ] 发布到 npm registry

**GitHub 仓库**：
- [ ] 创建仓库
- [ ] 编写详细的 README
- [ ] 添加贡献指南
- [ ] 设置 Issue 模板
- [ ] 配置 CI/CD（GitHub Actions）
- [ ] 添加代码覆盖率徽章

---

## 14. 未来扩展

### 14.1 可能的功能

1. **GUI 界面**
   - Electron 桌面应用
   - 可视化的空间分析
   - 拖拽式项目管理

2. **智能建议**
   - 根据项目使用频率建议清理
   - 分析哪些依赖可以升级
   - 检测过时的依赖

3. **团队协作**
   - 共享清理配置
   - 团队清理策略模板
   - 清理统计分析

4. **IDE 集成**
   - VS Code 扩展
   - Android Studio 插件
   - IntelliJ IDEA 插件

5. **云存储集成**
   - 备份重要配置到云端
   - 同步清理策略
   - 团队配置共享

### 14.2 性能优化

1. **并行清理**
   - 多个项目并行清理
   - 使用 Worker Threads

2. **增量扫描**
   - 记录上次清理时间
   - 只扫描变更的部分

3. **缓存机制**
   - 缓存项目结构信息
   - 缓存大小计算结果

---

## 15. 总结

本文档详细规划了 Flutter 项目清理工具的设计和实现方案。核心要点：

1. **安全第一**：通过白名单、确认机制、错误处理等确保清理安全
2. **分级清理**：提供快速、标准、深度三个级别，满足不同场景
3. **用户友好**：交互式界面、清晰的提示、详细的报告
4. **可扩展性**：模块化设计，便于后续功能扩展
5. **跨平台**：支持 Windows、macOS、Linux

**技术栈**：Node.js + TypeScript + 丰富的 CLI 生态

**开发优先级**：
- 第一版：核心清理功能（1-2周）
- 第二版：配置和多项目支持（1-2周）
- 第三版：高级特性和优化（2-3周）

这个工具将大大提升 Flutter 开发者的工作效率，帮助他们更好地管理项目空间。
```
