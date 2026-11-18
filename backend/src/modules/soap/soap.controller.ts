import { Controller, Get, Header, Post, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public, SkipCsrf } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

const WSDL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="MediConnectClinicalService"
  targetNamespace="http://mediconnect.utc.mx/soap/clinical"
  xmlns:tns="http://mediconnect.utc.mx/soap/clinical"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns="http://schemas.xmlsoap.org/wsdl/">

  <types>
    <xsd:schema targetNamespace="http://mediconnect.utc.mx/soap/clinical">
      <xsd:element name="VerifyAppointmentFolioRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="folio" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="VerifyAppointmentFolioResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="found" type="xsd:boolean"/>
            <xsd:element name="folio" type="xsd:string"/>
            <xsd:element name="status" type="xsd:string"/>
            <xsd:element name="patientName" type="xsd:string"/>
            <xsd:element name="doctorName" type="xsd:string"/>
            <xsd:element name="clinicName" type="xsd:string"/>
            <xsd:element name="scheduledAt" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="GetDoctorCatalogRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="specialty" type="xsd:string" minOccurs="0"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="VerifyAppointmentFolioInput">
    <part name="parameters" element="tns:VerifyAppointmentFolioRequest"/>
  </message>
  <message name="VerifyAppointmentFolioOutput">
    <part name="parameters" element="tns:VerifyAppointmentFolioResponse"/>
  </message>
  <message name="GetDoctorCatalogInput">
    <part name="parameters" element="tns:GetDoctorCatalogRequest"/>
  </message>
  <message name="GetDoctorCatalogOutput">
    <part name="parameters" element="tns:GetDoctorCatalogRequest"/>
  </message>

  <portType name="MediConnectClinicalPortType">
    <operation name="VerifyAppointmentFolio">
      <input message="tns:VerifyAppointmentFolioInput"/>
      <output message="tns:VerifyAppointmentFolioOutput"/>
    </operation>
    <operation name="GetDoctorCatalog">
      <input message="tns:GetDoctorCatalogInput"/>
      <output message="tns:GetDoctorCatalogOutput"/>
    </operation>
  </portType>

  <binding name="MediConnectClinicalBinding" type="tns:MediConnectClinicalPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="VerifyAppointmentFolio">
      <soap:operation soapAction="http://mediconnect.utc.mx/soap/clinical/VerifyAppointmentFolio"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="GetDoctorCatalog">
      <soap:operation soapAction="http://mediconnect.utc.mx/soap/clinical/GetDoctorCatalog"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <service name="MediConnectClinicalService">
    <port name="MediConnectClinicalPort" binding="tns:MediConnectClinicalBinding">
      <soap:address location="http://localhost:4000/soap/clinical"/>
    </port>
  </service>
</definitions>`;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<(?:\\w+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Web Service Propio SOAP 1.1/1.2 con contrato WSDL formal.
 * Permite interoperabilidad XML empresarial (ej. sistemas hospitalarios legados / aseguradoras).
 */
@ApiExcludeController()
@Controller('soap')
export class SoapController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('clinical')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  getWsdl(@Query('wsdl') wsdl?: string) {
    if (wsdl !== undefined) {
      return WSDL_XML;
    }
    return WSDL_XML;
  }

  @Public()
  @SkipCsrf()
  @Post('clinical')
  async handleSoapEnvelope(@Req() req: Request, @Res() res: Response) {
    const rawXml =
      typeof req.body === 'string'
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString('utf8')
          : JSON.stringify(req.body || '');

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');

    // Verificar operación VerifyAppointmentFolio
    if (rawXml.includes('VerifyAppointmentFolio')) {
      const folio = extractTag(rawXml, 'folio') || '';
      const appt = await this.prisma.appointment.findUnique({
        where: { folio },
        include: {
          patient: { select: { fullName: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          clinic: { select: { name: true } },
        },
      });

      const bodyXml = appt
        ? `<tns:VerifyAppointmentFolioResponse>
        <found>true</found>
        <folio>${escapeXml(appt.folio)}</folio>
        <status>${escapeXml(appt.status)}</status>
        <paymentStatus>${escapeXml(appt.paymentStatus)}</paymentStatus>
        <patientName>${escapeXml(appt.patient.fullName)}</patientName>
        <doctorName>${escapeXml(appt.doctor.user.fullName)}</doctorName>
        <clinicName>${escapeXml(appt.clinic.name)}</clinicName>
        <scheduledAt>${escapeXml(appt.scheduledAt.toISOString())}</scheduledAt>
      </tns:VerifyAppointmentFolioResponse>`
        : `<tns:VerifyAppointmentFolioResponse>
        <found>false</found>
        <folio>${escapeXml(folio)}</folio>
        <status>NOT_FOUND</status>
      </tns:VerifyAppointmentFolioResponse>`;

      return res.status(200).send(this.wrapEnvelope(bodyXml));
    }

    // Verificar operación GetDoctorCatalog
    if (rawXml.includes('GetDoctorCatalog')) {
      const specialty = extractTag(rawXml, 'specialty') || '';
      const doctors = await this.prisma.doctor.findMany({
        where: specialty ? { specialty: { contains: specialty } } : {},
        include: {
          user: { select: { fullName: true } },
          clinic: { select: { name: true } },
        },
      });

      const doctorsXml = doctors
        .map(
          (doc) => `<doctor>
          <id>${escapeXml(doc.id)}</id>
          <fullName>${escapeXml(doc.user.fullName)}</fullName>
          <specialty>${escapeXml(doc.specialty)}</specialty>
          <licenseNumber>${escapeXml(doc.licenseNumber)}</licenseNumber>
          <clinic>${escapeXml(doc.clinic.name)}</clinic>
          <feeMxn>${doc.consultationFee.toFixed(2)}</feeMxn>
        </doctor>`,
        )
        .join('\n');

      return res.status(200).send(
        this.wrapEnvelope(`<tns:GetDoctorCatalogResponse>
        <total>${doctors.length}</total>
        <doctors>${doctorsXml}</doctors>
      </tns:GetDoctorCatalogResponse>`),
      );
    }

    return res.status(400).send(
      this.wrapEnvelope(`<soap:Fault>
        <faultcode>soap:Client</faultcode>
        <faultstring>Operación SOAP no reconocida. Operaciones válidas: VerifyAppointmentFolio, GetDoctorCatalog</faultstring>
      </soap:Fault>`),
    );
  }

  private wrapEnvelope(innerBody: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://mediconnect.utc.mx/soap/clinical">
  <soap:Header>
    <tns:ServiceMetadata>
      <provider>MediConnect Pro SOAP 1.1 Gateway</provider>
      <timestamp>${new Date().toISOString()}</timestamp>
    </tns:ServiceMetadata>
  </soap:Header>
  <soap:Body>
    ${innerBody}
  </soap:Body>
</soap:Envelope>`;
  }
}
