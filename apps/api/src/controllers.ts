import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { Current, Ctx, Public } from './auth';
import { anonClient, unwrap } from './supabase';
import { CreateAllocationDto, CreateItemDto, FirstAccessDto, UpdateAllocationDto, UpdateItemDto } from './dto';

@Controller()
export class AppController {
  constructor(private readonly budget: BudgetService) {}

  @Public()
  @Get()
  root() {
    return { name: 'Orçamento do Caio e da Júlia — API', ok: true };
  }

  @Public()
  @Get('health')
  health() {
    return { ok: true };
  }

  /** Primeiro acesso: cria a senha de um dos e-mails liberados. */
  @Public()
  @Post('auth/first-access')
  @HttpCode(201)
  async firstAccess(@Body() dto: FirstAccessDto) {
    unwrap(await anonClient().rpc('first_access', { p_email: dto.email, p_password: dto.password }));
    return { ok: true };
  }

  @Get('me')
  me(@Current() { person }: Ctx) {
    return { id: person.id, name: person.name, color: person.color, email: person.email };
  }

  @Get('people')
  people(@Current() { sb }: Ctx) {
    return this.budget.people(sb);
  }
}

@Controller('months')
export class MonthsController {
  constructor(private readonly budget: BudgetService) {}

  @Get(':ym')
  get(@Current() { sb }: Ctx, @Param('ym') ym: string) {
    return this.budget.month(sb, ym);
  }

  @Post(':ym/items')
  addItem(@Current() { sb }: Ctx, @Param('ym') ym: string, @Body() dto: CreateItemDto) {
    return this.budget.addMonthItem(sb, ym, dto);
  }

  @Post(':ym/allocations')
  addAllocation(@Current() { sb }: Ctx, @Param('ym') ym: string, @Body() dto: CreateAllocationDto) {
    return this.budget.addMonthAllocation(sb, ym, dto);
  }
}

@Controller('items')
export class ItemsController {
  constructor(private readonly budget: BudgetService) {}

  @Patch(':id')
  update(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.budget.updateItem(sb, 'month_items', id, dto);
  }

  @Delete(':id')
  remove(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string) {
    return this.budget.deleteRow(sb, 'month_items', id);
  }
}

@Controller('allocations')
export class AllocationsController {
  constructor(private readonly budget: BudgetService) {}

  @Patch(':id')
  update(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAllocationDto) {
    return this.budget.updateAllocation(sb, 'month_allocations', id, dto);
  }

  @Delete(':id')
  remove(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string) {
    return this.budget.deleteRow(sb, 'month_allocations', id);
  }
}

@Controller('template')
export class TemplateController {
  constructor(private readonly budget: BudgetService) {}

  @Get()
  get(@Current() { sb }: Ctx) {
    return this.budget.template(sb);
  }

  @Post('items')
  addItem(@Current() { sb }: Ctx, @Body() dto: CreateItemDto) {
    return this.budget.addTemplateItem(sb, dto);
  }

  @Patch('items/:id')
  updateItem(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.budget.updateItem(sb, 'template_items', id, dto);
  }

  @Delete('items/:id')
  removeItem(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string) {
    return this.budget.deleteRow(sb, 'template_items', id);
  }

  @Post('allocations')
  addAllocation(@Current() { sb }: Ctx, @Body() dto: CreateAllocationDto) {
    return this.budget.addTemplateAllocation(sb, dto);
  }

  @Patch('allocations/:id')
  updateAllocation(
    @Current() { sb }: Ctx,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAllocationDto,
  ) {
    return this.budget.updateAllocation(sb, 'template_allocations', id, dto);
  }

  @Delete('allocations/:id')
  removeAllocation(@Current() { sb }: Ctx, @Param('id', ParseUUIDPipe) id: string) {
    return this.budget.deleteRow(sb, 'template_allocations', id);
  }
}
