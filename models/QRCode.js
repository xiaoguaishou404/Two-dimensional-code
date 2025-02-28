const supabase = require('../config/supabase');

class QRCode {
    static async create(data) {
        const { data: result, error } = await supabase
            .from('qrcodes')
            .insert([{
                qr_id: data.qr_id,
                has_file: data.has_file || false,
                filename: data.filename || null,
                original_filename: data.original_filename || null,
                file_url: data.file_url || null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('创建二维码记录错误:', error);
            throw error;
        }

        return result;
    }

    static async findOne(query) {
        const { data, error } = await supabase
            .from('qrcodes')
            .select('*')
            .eq('qr_id', query.qr_id)
            .single();

        if (error) {
            console.error('查询二维码记录错误:', error);
            return null;
        }

        return data;
    }

    static async findOneAndUpdate(query, update) {
        const { data, error } = await supabase
            .from('qrcodes')
            .update({
                has_file: update.has_file,
                filename: update.filename,
                original_filename: update.original_filename,
                file_url: update.file_url,
                updated_at: new Date().toISOString()
            })
            .eq('qr_id', query.qr_id)
            .select()
            .single();

        if (error) {
            console.error('更新二维码记录错误:', error);
            throw error;
        }

        return data;
    }

    static async find(options = {}) {
        let query = supabase
            .from('qrcodes')
            .select('*');

        if (options.has_file !== undefined) {
            query = query.eq('has_file', options.has_file);
        }

        if (options.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = field === 'created_at' ? 'created_at' : field;
            query = query.order(column, { ascending: order === 1 });
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('查询二维码列表错误:', error);
            throw error;
        }

        return data;
    }

    static async countDocuments(query = {}) {
        let countQuery = supabase
            .from('qrcodes')
            .select('*', { count: 'exact' });

        if (query.has_file !== undefined) {
            countQuery = countQuery.eq('has_file', query.has_file);
        }

        const { count, error } = await countQuery;

        if (error) {
            console.error('统计二维码数量错误:', error);
            throw error;
        }

        return count;
    }
}

module.exports = QRCode; 