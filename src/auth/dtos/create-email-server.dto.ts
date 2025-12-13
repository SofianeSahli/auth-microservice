export interface CreateEmailServerDto {

    // Recipients
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    from?: string;

    title?: string;
    description?: string;
    // Content
    subject: string;
    html?: string;
    text?: string;
    template?: string; // Template name
    templateData?: Record<string, any>;

    // Attachments
    attachments?: Array<{
        filename?: string;
        path?: string;
        content?: Buffer | string;
        contentType?: string;
        encoding?: string;
        cid?: string; // Content ID for inline images
    }>;

    // Metadata
    tags?: string[];
    metadata?: Record<string, any>;
}
/*
export class CreateEmailServerDto {
    to: string;

}*/