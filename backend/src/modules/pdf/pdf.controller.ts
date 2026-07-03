import {
  Controller,
  Get,
  Post,
  Query,
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
import { PdfService } from './pdf.service';

@Controller('pdf')
@UseGuards(JwtAuthGuard, RestRolesGuard)
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('extract')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async extract(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo');
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('El archivo debe ser un PDF');
    }
    return this.pdfService.extractFromPdf(file.buffer);
  }

  @Post('to-excel')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async toExcel(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo');
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('El archivo debe ser un PDF');
    }
    const buffer = await this.pdfService.convertToExcel(
      file.buffer,
      file.originalname,
    );
    const outName = file.originalname.replace(/\.pdf$/i, '') + '.xlsx';
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${outName}"`,
    });
    res.send(buffer);
  }

  @Post('import')
  @Roles(RoleName.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo');
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('El archivo debe ser un PDF');
    }
    const user = req.user as JwtUserPayload;
    return this.pdfService.importToDatabase(
      file.buffer,
      file.originalname,
      user?.sub,
    );
  }
}
