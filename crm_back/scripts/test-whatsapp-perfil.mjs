import dotenv from 'dotenv';
import { obterPerfilWhatsApp } from '../dist/utils/helpers/whatsappCloudHelpers.js';

dotenv.config();

const perfil = await obterPerfilWhatsApp();
console.log(JSON.stringify(perfil, null, 2));
