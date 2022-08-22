import Calls from "./Calls";
import * as dotenv from "dotenv";
import GoogleDrive from "./services/GoogleDrive";
import GoogleSheets from "./services/GoogleSheets";
import SequelizeService from "./services/SequelizeService";
import { file } from "googleapis/build/src/apis/file";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

dotenv.config();
const sequelizeService = new SequelizeService();

const generateSheetInGoogleDrive = async () => {
  const callService = new Calls();
  const drive = new GoogleDrive();
  const sheets = new GoogleSheets();
  const institutions = await sequelizeService.queryCodes();
  for (const institution of institutions) {
    //Si existe la capeta
    if (institution.name) {
      //Buscamos la carpeta
      let folder = await drive.searchFolder(institution.name);
      //Si no existe la carpeta de esa institucion
      if (folder === undefined) {
        //Crea la carpeta
        folder = await drive.createFolder(institution.name);
        //Crea la hoja
        const sheetID = await sheets.createFile(institution.code);
        //Mueve la hoja a la carpeta
        await drive.moveFilesToFolder(sheetID, folder);
        //Genera el reporte
        await callService.generateReport(institution.code, sheetID);
      } else {
        //Si existe la carpeta
        const file = await drive.getFileByCode(institution.code);
        //Y no existe el archivo lo crea
        if (file === undefined) {
          const sheetID = await sheets.createFile(institution.code);
          await callService.generateReport(institution.code, sheetID);
          await drive.moveFilesToFolder(sheetID, folder);
        } else if (file.parents?.[0] === folder) {
          //Si la carpeta es padre del archivo de ese codigo
          //Sobrescribe el reporte
          await callService.generateReport(
            institution.code,
            <string>file?.id,
            true
          );
        }
      }
      // Comparto la carpeta
      await drive.shareFiles(
        "user",
        "franco.garancini@braintly.com",
        "reader",
        folder
      );
    } else {
      //Si no pertenece a una institucion
      const sheetID = await sheets.createFile(institution.code);
      await callService.generateReport(institution.code, sheetID, false);
      //Comparte solamente el archivo
      await drive.shareFiles(
        "user",
        "franco.garancini@braintly.com",
        "reader",
        sheetID
      );
    }
  }
};

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  await generateSheetInGoogleDrive();

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "ok",
    }),
  };
};

