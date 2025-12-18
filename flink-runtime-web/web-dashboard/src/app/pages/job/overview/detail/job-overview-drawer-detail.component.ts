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

import { DecimalPipe, NgIf } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef, Inject, Type } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DynamicHostComponent } from '@flink-runtime-web/components/dynamic/dynamic-host.component';
import { HumanizeBytesPipe } from '@flink-runtime-web/components/humanize-bytes.pipe';
import { HumanizeDatePipe } from '@flink-runtime-web/components/humanize-date.pipe';
import { HumanizeDurationPipe } from '@flink-runtime-web/components/humanize-duration.pipe';
import { NodesItemCorrect } from '@flink-runtime-web/interfaces';
import {
  JOB_OVERVIEW_MODULE_CONFIG,
  JOB_OVERVIEW_MODULE_DEFAULT_CONFIG,
  JobOverviewModuleConfig
} from '@flink-runtime-web/pages/job/overview/job-overview.config';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { JobLocalService } from '../../job-local.service';

@Component({
  selector: 'flink-job-overview-drawer-detail',
  templateUrl: './job-overview-drawer-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./job-overview-drawer-detail.component.less'],
  imports: [
    NgIf,
    NzDividerModule,
    NzGridModule,
    DynamicHostComponent,
    HumanizeDatePipe,
    HumanizeDurationPipe,
    DecimalPipe,
    HumanizeBytesPipe,
    NzIconModule,
    NzTooltipModule
  ]
})
export class JobOverviewDrawerDetailComponent implements OnInit, OnDestroy {
  public node: NodesItemCorrect | null;
  public stateBadgeComponent: Type<unknown>;
  public taskCountComponent: Type<unknown>;
  public decodedDescription: string | null = null;

  private readonly destroy$ = new Subject<void>();

  /**
   * Decode HTML entities and tags from text
   */
  private decodeHTML(value: string): string | null {
    const parser = new DOMParser();
    const dom = parser.parseFromString(`<!doctype html><body>${value}`, 'text/html');
    return dom.body.textContent;
  }

  constructor(
    private readonly jobLocalService: JobLocalService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(JOB_OVERVIEW_MODULE_CONFIG) readonly moduleConfig: JobOverviewModuleConfig
  ) {
    this.stateBadgeComponent =
      moduleConfig.customComponents?.stateBadgeComponent ||
      JOB_OVERVIEW_MODULE_DEFAULT_CONFIG.customComponents.stateBadgeComponent;
    this.taskCountComponent =
      moduleConfig.customComponents?.taskCountBadgeComponent ||
      JOB_OVERVIEW_MODULE_DEFAULT_CONFIG.customComponents.taskCountBadgeComponent;
  }

  public ngOnInit(): void {
    this.jobLocalService
      .selectedVertexChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(node => {
        this.node = node;
        if (this.node != null) {
          let description = this.decodeHTML(this.node.description);
          if (this.node.detail) {
            description = this.decodeHTML(this.node.detail.name);
          }
          if (description && description.indexOf('<br/>') > 0) {
            description = description.replace(/<br\/>/g, '\n');
          }
          this.decodedDescription = description;
        } else {
          this.decodedDescription = null;
        }
        this.cdr.markForCheck();
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
