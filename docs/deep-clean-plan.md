# Flutter Cleaner 深度清理模式实现计划

## 概述

实现深度清理（Deep）模式，包含全局缓存清理功能。

## 新增功能

### 深度清理内容
- Standard 级别的所有内容
- `~/.gradle/caches/` - 全局 Gradle 缓存（智能清理）
- `~/Library/Caches/CocoaPods/` - CocoaPods 全局缓存（macOS）
- `~/.pub-cache/` - 全局 Pub 缓存（智能清理未使用的包）

## 实现步骤

### Step 1: 依赖读取器
- 文件: `src/core/DependencyReader.ts`
- 功能: 读取 pubspec.yaml 和 pubspec.lock，收集项目依赖

### Step 2: 全局缓存清理器
- 文件: `src/cleaners/GlobalCacheCleaner.ts`
- 功能: 清理 Gradle、CocoaPods、Pub 全局缓存

### Step 3: 依赖读取器测试
- 文件: `src/__tests__/core/DependencyReader.test.ts`

### Step 4: 全局缓存清理器测试
- 文件: `src/__tests__/cleaners/GlobalCacheCleaner.test.ts`

### Step 5: 更新 InteractiveCLI
- 文件: `src/cli/InteractiveCLI.ts`
- 新增: 深度清理二次确认、风险警告、缓存预览

### Step 6: 更新命令行入口
- 文件: `src/index.ts`
- 新增: `--deep` 选项、配置文件自动查找

### Step 7: 更新 ConfigManager
- 文件: `src/core/ConfigManager.ts`
- 新增: 自动查找配置、项目配置支持

### Step 8: Gradle 智能清理实现
- 策略: 分析 pubspec.lock 收集已用包，删除未使用的缓存

## 关键实现要点

### 1. Pub 缓存智能清理
遍历 `~/.pub-cache/hosted/` 下的包版本，与已用依赖对比，删除未使用的版本。

### 2. 深度清理二次确认
需要用户输入项目名称进行确认，并显示风险警告。

## 命令行选项
```bash
flutter-cleaner --deep           # 深度清理
flutter-cleaner --deep --dry-run # 预览模式
```

## 测试
```bash
npm test
```
