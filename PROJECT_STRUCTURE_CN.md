# Xinya Finance 项目结构说明

本文档详细介绍了项目的目录结构和主要文件的作用，旨在帮助开发者快速理解和维护代码。

## 📂 根目录 (Root)

| 文件/文件夹 | 作用 |
| :--- | :--- |
| `App.tsx` | **核心入口组件**。负责整个应用的路由逻辑、全局状态管理（如当前模块、选中部门、日期范围等）以及主要布局的渲染。它是连接数据层和视图层的桥梁。 |
| `index.tsx` | **React 挂载点**。负责将 `App` 组件挂载到 HTML 的 DOM 节点上。 |
| `index.html` | **HTML 模板**。应用的主页面入口。 |
| `types.ts` | **类型定义文件**。定义了项目中使用的所有 TypeScript 接口和类型，例如 `PurchaseRecord` (采购记录), `MonthlySummary` (月度汇总) 等。维护数据结构的一致性非常重要。 |
| `vite.config.ts` | **Vite 配置文件**。配置构建工具的行为，如端口、插件等。 |
| `package.json` | **项目依赖管理**。记录了项目所需的 npm 包和脚本命令。 |
| `metadata.json` | **项目元数据**。包含项目名称等基本信息。 |

## 📂 components (组件目录)

存放所有的 React 组件，按功能进行分类。

### 📂 components/charts (图表组件)

存放基于 Recharts 或 Plotly 的可视化图表组件。

| 文件 | 作用 |
| :--- | :--- |
| `MonthlyPurchaseChart.tsx` | **月度采购/付款趋势图**。显示各部门每月的采购或付款总额。支持 `type="PURCHASE" | "PAYMENT"`。 |
| `WeeklyDeptChart.tsx` | **部门周度趋势图**。显示特定月份内，各部门的周度支出变化。 |
| `CompanyWeekChart.tsx` | **公司周度趋势图**。显示特定部门下，各供应商（公司）的周度支出排行。 |
| `DistributionChart.tsx` | **分布气泡图**。展示供应商的采购/付款分布情况（金额 vs 时间）。**支持向下钻取功能**（点击气泡显示详情）。 |
| `CycleCharts.tsx` | **付款周期分析图表**。包含 `PaymentCycleBarChart`（付款周期条形图）和 `ForecastChart`（预测图）。 |
| `UnpaidCharts.tsx` | **未付款分析图表**。用于展示未付款金额的分布和账龄分析。 |

### 📂 components/modules (业务模块组件)

存放特定业务逻辑的复杂组件或页面级组件。

| 文件 | 作用 |
| :--- | :--- |
| `PaymentDetailTable.tsx` | **付款/采购详情表**。用于“分布气泡图”向下钻取时显示的详细交易记录表格。 |
| `UnpaidDashboard.tsx` | **未付款仪表盘**。整合了未付款分析的所有图表和逻辑。 |
| `ForecastDashboard.tsx` | **预测仪表盘**。整合了付款周期预测的所有图表和逻辑。 |

### 📂 components/ui (通用 UI 组件)

存放可复用的基础 UI 组件，通常与具体业务逻辑解耦。

| 文件 | 作用 |
| :--- | :--- |
| `GlassCard.tsx` | **玻璃拟态卡片**。用于包裹图表或内容的容器，提供统一的视觉风格。 |
| `Select.tsx` | **下拉选择框**。通用的单选组件。 |
| `MultiSelect.tsx` | **多选下拉框**。支持选择多个选项。 |
| `DatePicker.tsx` | **日期选择器**。用于选择开始和结束日期。 |
| `SearchableSelect.tsx` | **可搜索下拉框**。支持搜索功能的下拉选择组件。 |
| `AdminUpload.tsx` | **管理员上传组件**。负责处理 Excel/CSV 文件的上传和解析逻辑。 |
| `PaymentIntelligence.tsx` | **智能分析组件**。用于展示付款相关的智能洞察（如异常检测等）。 |

## 📂 services (服务层)

存放数据处理、API 调用和辅助函数。

| 文件 | 作用 |
| :--- | :--- |
| `dataProcessor.ts` | **数据处理核心**。包含所有的数据清洗、聚合、计算逻辑。例如：<br>- `cleanData`: 清洗原始数据<br>- `getMonthlySummary`: 计算月度汇总<br>- `getCompanyBubbleData`: 计算气泡图数据<br>- `getPaymentCycleMetrics`: 计算付款周期指标<br>**这是维护业务逻辑最频繁修改的文件。** |
| `supabase.ts` | **数据库服务**。负责与 Supabase 后端数据库进行交互（查询、插入等）。 |
| `translations.ts` | **多语言翻译**。包含中文 (CN) 和法文 (FR) 的文本映射。 |
| `mockData.ts` | **模拟数据**。开发阶段使用的测试数据（如果未使用真实后端）。 |

## 维护指南

1.  **修改图表逻辑**：
    *   如果是修改**数据计算方式**（如怎么算总额、怎么过滤），请去 `services/dataProcessor.ts`。
    *   如果是修改**图表显示样式**（如颜色、Tooltip 内容、坐标轴），请去 `components/charts/` 下对应的图表文件。

2.  **修改页面布局**：
    *   主页面结构在 `App.tsx`。
    *   特定模块（如未付款页面）的布局在 `components/modules/` 下。

3.  **新增字段或修改数据结构**：
    *   首先在 `types.ts` 中更新接口定义。
    *   然后在 `services/supabase.ts` (如果涉及数据库) 和 `services/dataProcessor.ts` 中更新处理逻辑。

4.  **修改文字/翻译**：
    *   直接修改 `services/translations.ts`。

希望这份文档能帮助您更好地管理和维护项目！
