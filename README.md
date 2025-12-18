# Apache Flink History Server

Apache Flink is an open source stream processing framework with powerful stream- and batch-processing capabilities.

Learn more about Flink at [https://flink.apache.org/](https://flink.apache.org/)


This project is forked with Apache Flink offical.

### Features
* Version Compatible 1.11 ~ 2.1 with one deployment.
* Resolved Checkpoint diverged fields: `Checkpointed size` and `Full Checkpointed size`
* Resolved Dag TaskManager endpoint with host field.
* Resolved 1.16+ Cluster Configuration Tab compatibility warning.
* Almost 90% Chinese Translation.
* New page for log analysis with all vertices related container taskmanagers listed.
* optimization: completed jobs need not refresh periodically for job detail or page relevant.

### 特性
* 广泛兼容1.11~2.1，只需要一个部署
* 定位并解决Checkpoint页面的兼容性，解决`Checkpointed size` and `Full Checkpointed size`变更导致的页面崩溃问题
* 定位并解决DAG Vertices TaskManager面板Endpoint字段和Host字段
* 新增针对1.16以上版本才有的集群配置信息Tab的兼容性提示
* 几乎90%中文翻译
* 新增日志分析页面，一次性列出全部子任务和相关的TaskManager以及日志链接
* 优化：已完成的作业不再需要定时刷新作业信息和相关页面
