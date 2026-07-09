import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RestRolesGuard } from '../../common/guards/rest-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { ExcelService } from './excel.service';

@Controller('excel')
@UseGuards(JwtAuthGuard, RestRolesGuard)
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post('import')
  @Roles(RoleName.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo');
    }
    const user = req.user as JwtUserPayload;
    return this.excelService.import(
      file.buffer,
      file.originalname,
      user?.sub,
    );
  }

  @Get('export')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async export(@Req() req: Request, @Res() res: Response) {
    const user = req.user as JwtUserPayload;
    const buffer = await this.excelService.export(user?.sub);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="inventario_actualizado.xlsx"',
    });
    res.send(Buffer.from(buffer));
  }

  @Get('template')
  async template(@Res() res: Response) {
    const buffer = await this.excelService.template();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_inventario.xlsx"',
    });
    res.send(Buffer.from(buffer));
  }
}
