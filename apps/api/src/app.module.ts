import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth';
import { BudgetService } from './budget.service';
import {
  AllocationsController,
  AppController,
  ItemsController,
  MonthsController,
  TemplateController,
} from './controllers';

@Module({
  controllers: [AppController, MonthsController, ItemsController, AllocationsController, TemplateController],
  providers: [BudgetService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
