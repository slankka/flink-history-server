/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, Type } from '@angular/core';
import { of, Subject } from 'rxjs';
import { catchError, mergeMap, takeUntil } from 'rxjs/operators';

import { DynamicHostComponent } from '@flink-runtime-web/components/dynamic/dynamic-host.component';
import { HumanizeBytesPipe } from '@flink-runtime-web/components/humanize-bytes.pipe';
import { HumanizeDatePipe } from '@flink-runtime-web/components/humanize-date.pipe';
import { HumanizeDurationPipe } from '@flink-runtime-web/components/humanize-duration.pipe';
import { VerticesItem, VertexTaskManagerDetail } from '@flink-runtime-web/interfaces';
import { JobLocalService } from '@flink-runtime-web/pages/job/job-local.service';
import { CompletedJobTaskmanagersTableActionComponent } from '@flink-runtime-web/pages/job/modules/completed-job/taskmanagers-table-action/completed-job-taskmanagers-table-action.component';
import {
  JOB_OVERVIEW_MODULE_CONFIG,
  JOB_OVERVIEW_MODULE_DEFAULT_CONFIG,
  JobOverviewModuleConfig
} from '@flink-runtime-web/pages/job/overview/job-overview.config';
import { JobService, TaskManagerService } from '@flink-runtime-web/services';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzTableModule } from 'ng-zorro-antd/table';

interface VertexTaskManagerData {
  vertex: VerticesItem;
  taskManagers: Array<VertexTaskManagerDetail & { logUrl?: string }>;
  isLoading: boolean;
  error?: string;
  isExpanded: boolean;
}

@Component({
  selector: 'flink-log-analysis',
  templateUrl: './log-analysis.component.html',
  styleUrls: ['./log-analysis.component.less'],
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    NzTableModule,
    NgIf,
    NgFor,
    HumanizeBytesPipe,
    DecimalPipe,
    HumanizeDatePipe,
    HumanizeDurationPipe,
    DynamicHostComponent,
    NzCollapseModule,
    NzAlertModule,
    NzButtonModule
  ],
  standalone: true
})
export class LogAnalysisComponent implements OnInit, OnDestroy {
  public vertexData: VertexTaskManagerData[] = [];
  public isLoading = true;
  public actionComponent = CompletedJobTaskmanagersTableActionComponent;
  public stateBadgeComponent: Type<unknown>;
  public taskCountBadgeComponent: Type<unknown>;
  public collapseAll = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly jobService: JobService,
    private readonly jobLocalService: JobLocalService,
    private readonly taskManagerService: TaskManagerService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(JOB_OVERVIEW_MODULE_CONFIG) readonly moduleConfig: JobOverviewModuleConfig
  ) {
    this.stateBadgeComponent =
      moduleConfig.customComponents?.stateBadgeComponent ||
      JOB_OVERVIEW_MODULE_DEFAULT_CONFIG.customComponents.stateBadgeComponent;
    this.taskCountBadgeComponent =
      moduleConfig.customComponents?.taskCountBadgeComponent ||
      JOB_OVERVIEW_MODULE_DEFAULT_CONFIG.customComponents.taskCountBadgeComponent;
  }

  ngOnInit(): void {
    this.jobLocalService
      .jobDetailChanges()
      .pipe(
        mergeMap(jobDetail => {
          if (!jobDetail.vertices || jobDetail.vertices.length === 0) {
            this.vertexData = [];
            this.isLoading = false;
            this.cdr.markForCheck();
            return of([]);
          }

          // Create vertex data with loading state
          if (this.vertexData.length === 0) {
            // First time initialization
            this.vertexData = jobDetail.vertices.map((vertex, index) => ({
              vertex,
              taskManagers: [],
              isLoading: true,
              error: undefined,
              isExpanded: index === 0  // Only the first vertex is expanded by default
            }));
          } else {
            // Preserve expanded states during data refresh
            const expandedStates = this.vertexData.reduce((acc, vertex) => {
              acc[vertex.vertex.id] = vertex.isExpanded;
              return acc;
            }, {} as Record<string, boolean>);

            this.vertexData = jobDetail.vertices.map((vertex, index) => {
              const existingVertex = this.vertexData.find(v => v.vertex.id === vertex.id);
              return {
                vertex,
                taskManagers: existingVertex?.taskManagers || [],
                isLoading: true,
                error: undefined,
                isExpanded: expandedStates[vertex.id] !== undefined ? expandedStates[vertex.id] : index === 0
              };
            });
          }
          this.isLoading = false;
          this.cdr.markForCheck();

          // Load task managers for each vertex
          this.vertexData.forEach((vertexData, index) => {
            this.jobService
              .loadTaskManagers(jobDetail.jid, vertexData.vertex.id)
              .pipe(
                mergeMap(response => {
                  this.vertexData[index].taskManagers = response.taskmanagers;

                  // Load log URLs for each task manager
                  response.taskmanagers.forEach(taskManager => {
                    if (taskManager['taskmanager-id'] && taskManager['taskmanager-id'] !== '(unassigned)') {
                      this.taskManagerService
                        .loadHistoryServerTaskManagerLogUrl(jobDetail.jid, taskManager['taskmanager-id'])
                        .pipe(
                          catchError(() => of('')),
                          takeUntil(this.destroy$)
                        )
                        .subscribe(logUrl => {
                          const taskManagerWithLog = taskManager as VertexTaskManagerDetail & { logUrl?: string };
                          taskManagerWithLog.logUrl = logUrl;
                          this.cdr.markForCheck();
                        });
                    }
                  });

                  this.vertexData[index].isLoading = false;
                  this.cdr.markForCheck();
                  return of(response);
                }),
                catchError(_error => {
                  this.vertexData[index].error = 'Failed to load task managers';
                  this.vertexData[index].isLoading = false;
                  this.cdr.markForCheck();
                  return of([]);
                })
              )
              .subscribe();
          });

          // Execute all load tasks
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByVertexId(_index: number, item: VertexTaskManagerData): string {
    return item.vertex.id;
  }

  trackByEndpoint(_index: number, item: VertexTaskManagerDetail): string {
    return item.endpoint || item.host;
  }

  toggleCollapseAll(): void {
    const newState = !this.collapseAll;
    this.collapseAll = newState;

    // Create a new array to trigger Angular change detection
    this.vertexData = this.vertexData.map(vertex => ({
      ...vertex,
      isExpanded: newState
    }));

    console.log('Collapse state changed to:', this.collapseAll, 'vertexData:', this.vertexData.map(v => ({ id: v.vertex.id, isExpanded: v.isExpanded })));
  }
}
