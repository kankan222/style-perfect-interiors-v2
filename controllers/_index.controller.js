const db = require('../config/db.config')
const dataUnity = require('../utils/arrange')
const { transactHandler } = require('../utils/transactionHandler')

// SELECT deals.*, normal_project_cat.category_id,normal_project_cat.npcid, task.task_name, normal_project_cat.cat_status, normal_project_subtask.stask_id, subtask.sub_task_name, normal_project_subtask.stask_status, normal_project_cat.project_status, normal_project_cat.dateofdeadline FROM deals INNER JOIN normal_project_cat ON normal_project_cat.ndeal_id = deals.id INNER JOIN task ON normal_project_cat.category_id = task.task_id LEFT JOIN normal_project_subtask ON normal_project_subtask.ndeal_id = deals.id AND normal_project_subtask.category_id = normal_project_cat.category_id LEFT JOIN subtask ON subtask.sub_task_id = normal_project_subtask.stask_id WHERE deals.id BETWEEN (SELECT MAX(id)-${Number(req.query.from) * 20} FROM deals) AND (SELECT MAX(id)-${Number(req.query.from) * 20} FROM deals) ORDER BY deals.id DESC;

// ---- All Index routes here ----
exports.indexDeshboard = async (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const q = `SELECT deals.*, normal_project_cat.category_id,normal_project_cat.npcid, task.task_name, normal_project_cat.cat_status, normal_project_subtask.stask_id, subtask.sub_task_name, normal_project_subtask.stask_status, normal_project_cat.project_status, normal_project_cat.dateofdeadline FROM deals INNER JOIN normal_project_cat ON normal_project_cat.ndeal_id = deals.id INNER JOIN task ON normal_project_cat.category_id = task.task_id LEFT JOIN normal_project_subtask ON normal_project_subtask.ndeal_id = deals.id AND normal_project_subtask.category_id = normal_project_cat.category_id LEFT JOIN subtask ON subtask.sub_task_id = normal_project_subtask.stask_id ORDER BY deals.id DESC;`
        await db.query(q, (err, results) => {
            const grouped = {};
            const sentData = []
            if (!err) {
                results.forEach(element => {
                    const key = element.id.toString();
                    if (!grouped[key]) { grouped[key] = [] }
                    grouped[key].push(element);
                })
                for (const key in grouped) { dataUnity(grouped[key]) }
                for (const key in grouped) { sentData.push(grouped[key][0]) }
                const sortedData = sentData.sort((a, b) => b.id - a.id);
                res.status(200).render('../views/admin/_index.ejs', { sortedData })
            }
        })
    } else { res.redirect('/admin/login') }
}

exports.userManager = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT em_id, name ,number, email,job_role, lastLoginAt ,lastLogoutAt , status FROM employee`;
        db.query(query, (err, result, field) => {
            res.status(200).render('../views/admin/user.ejs', { data: result })
        })
    }
}

exports.settings = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `select * from subtask;select * from task;select * from material_names`
        db.query(query, (err, result, field) => {
            if (!err) {
                res.status(200).render('../views/admin/settings.ejs', { data: result })
            } else {
                res.status(500).send({ status: false, msg: "Internal error occurs!" });
            }
        })
    }
}

exports.expense = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT * FROM expenses ORDER BY id DESC LIMIT 50;SELECT 'normal_projects_finance' AS tName, SUM(amount_got) AS total_amount_got, SUM(CASE WHEN modeofpay='online' THEN amount_got ELSE 0 END) AS online_sum, SUM(CASE WHEN modeofpay='cash' THEN amount_got ELSE 0 END) AS cash_sum FROM normal_projects_finance GROUP BY tName;
        SELECT  SUM(total_price) AS total_sum FROM deals;SELECT SUM(CASE WHEN md_type ='cash' THEN amount ELSE 0 END) AS cash_expenses, sum(case when md_type ='online' THEN amount ELSE 0 END) as online_expenses FROM expenses;`
        db.query(query, (err, result, field) => {
            res.status(200).render('../views/admin/expense.finance.ejs', { data: result })
        })
    }
}

exports.clients_vendors = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT vendors.id,vendors.name, vendors.contact, vendors.contact2, vendors.email, vendors.location, vendors.oth_details, sum(vendor_supplies.total_amount)as amount, sum(vendor_payments.amount)as paid FROM vendors LEFT JOIN vendor_supplies ON vendor_supplies.vendor_id=vendors.id LEFT JOIN vendor_payments ON vendor_payments.vendor_supply_id=vendor_supplies.id GROUP BY vendors.id; SELECT id, deal_name, reference_no, contact, contact2, agreement_amount, work_name, email, city, oth_details FROM deals ORDER BY id DESC LIMIT 5`
        db.query(query, (err, result, field) => {
            res.status(200).render('../views/admin/clients_vendors.ejs', { data: result })
        })
    }
}

exports.vendor_supplies = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT vendor_supplies.id, vendor_supplies.vendor_id, vendor_supplies.item_name, vendor_supplies.details, vendor_supplies.sgst, vendor_supplies.cgst, vendor_supplies.total_amount, vendor_supplies.modeofpay, vendor_supplies.date, vendor_supplies.gst_status, vendors.name, vendors.contact, vendors.location, COALESCE(SUM(vendor_payments.amount), 0) AS paid FROM vendor_supplies JOIN vendors ON vendor_supplies.vendor_id = vendors.id LEFT JOIN vendor_payments ON vendor_supplies.id = vendor_payments.vendor_supply_id GROUP BY vendor_supplies.id, vendor_supplies.vendor_id, vendor_supplies.item_name, vendor_supplies.details, vendor_supplies.sgst, vendor_supplies.cgst, vendor_supplies.total_amount, vendor_supplies.modeofpay, vendor_supplies.date, vendors.name, vendors.contact, vendors.location;SELECT id, name FROM vendors;`
        db.query(query, (err, result, field) => {
            if (!err) {
                res.status(200).render('../views/admin/vendor_supplies.ejs', { data: result })
            } else {
                return res.status(500).send({ msg: "Internal error occurs!" });
            }
        })
    }
}

exports.supply_payments = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT COALESCE(SUM(vendor_payments.amount), 0) AS total_payments, vendor_supplies.id, vendor_supplies.item_name, vendor_supplies.sgst, vendor_supplies.cgst, vendor_supplies.total_amount, vendor_supplies.date, vendors.name, vendors.contact, vendors.location FROM vendor_supplies JOIN vendors ON vendor_supplies.vendor_id = vendors.id LEFT JOIN vendor_payments ON vendor_supplies.id = vendor_payments.vendor_supply_id GROUP BY vendor_supplies.id, vendor_supplies.item_name, vendor_supplies.sgst, vendor_supplies.cgst, vendor_supplies.total_amount, vendor_supplies.date, vendors.name, vendors.contact, vendors.location;`
        db.query(query, (err, result, field) => {
            res.status(200).render('../views/admin/vendor_payments.ejs', { data: result })
        })
    }
}



//INVENTORY
// /USED
exports.inventory = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT deals.id,deals.reference_no,deals.city,deals.deal_name,deals.work_name,deals.np_deadline FROM material_used JOIN deals on deals.id =material_used.ndeal_id GROUP BY deals.id;`
        db.query(query, (err, result, field) => {
            if (!err) {
                res.status(200).render('../views/admin/inventory.ejs', { data: result })
            } else {
                res.status(500).send({ status: false, msg: "Internal error occurs!" });
            }
        })
    }
}

//  LEFT
exports.stock = (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT deals.id,deals.reference_no,deals.city,deals.deal_name,deals.work_name ,deals.np_deadline FROM material_left JOIN deals on deals.id =material_left.ndeal_id GROUP BY deals.id ;`;
        db.query(query, (err, result, field) => {
            if (!err) {
                res.status(200).render('../views/admin/stock.ejs', { data: result })
            } else {
                res.status(500).send({ status: false, msg: "Internal error occurs!" });
            }
        })
    }
}




//---Finance 
exports.renderNormalProjectFinance = async (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        let s = `SELECT deals.id, normal_projects_finance.fid, deals.reference_no,deals.deal_name,deals.city,normal_projects_finance.ndeal_id,normal_projects_finance.totalamount,normal_projects_finance.amount_got,normal_projects_finance.modeofpay,normal_projects_finance.dateofpay FROM normal_projects_finance JOIN deals on normal_projects_finance.ndeal_id= deals.id`;
        await db.query(s, (err, results) => {
            if (!err) {
                let newObj = {};
                (results).forEach(e => {
                    if (!newObj.hasOwnProperty(e.id)) {
                        newObj[e.id] = {
                            id: e.id, ref: e.reference_no,
                            title: e.deal_name, location: e.city,
                            total_amount: e.totalamount,
                        }
                    }
                })
                const MainObject = Object.values(newObj);
                const id_map = new Map();
                MainObject.forEach(obj => id_map.set(obj.id, obj));
                let matchingObj = [];
                (results).forEach(obj => {
                    matchingObj = id_map.get(obj.ndeal_id);
                    if (matchingObj) {
                        if (!matchingObj.payments) { matchingObj.payments = []; }
                        matchingObj.payments.push({
                            id: obj.ndeal_id, fid: obj.fid, amount_got: obj.amount_got,
                            modeofpay: obj.modeofpay, dateofpay: obj.dateofpay
                        });
                    }
                });
                res.status(200).render('../views/admin/project.finance.ejs', { data: MainObject })
            } else {
                res.status(500).send({ msg: "something error occured" })
            }
        })
    }
}


exports.renderNormalProjectForm = async (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT id FROM clients;`
        await db.query(query, (err, result) => {
            if (!err) {
                return res.status(200).render('../views/admin/project.form.ejs', { data: result })
            }
            return res.status(500).send({ msg: "something error occured" })
        });

    }
}


//---Normal project form works-------

exports.getClientDataForForm = async (req, res) => {
    if (req.session.isLoggedIn == true && req.session.role == 'admin') {
        const query = `SELECT * FROM clients where id = ?`
        await db.query(query, [req.query.refid], (err, result) => {
            if (!err) {
                return res.status(200).send({ result })
            }
            return res.status(500).send({ msg: "something error occured" })
        });

    }
},

    exports.insertNewNormalDeal = async (req, res) => {
        if (req.session.isLoggedIn == true && req.session.role == 'admin') {
            db.getConnection((err0, conn) => {
                if (err0) throw err0;
                conn.beginTransaction(function (err) {
                    if (err) {
                        res.status(500).send({ msg: "something error occured" })
                        return;
                    }

                    // -------- insert into deals tables -----------
                    const dealsTableData = [req.body.name, req.body.rfNo, req.body.contactNo, req.body.altContact, req.body.agreementAm, req.body.workName, req.body.email, req.body.city, req.body.remarks, req.body.TotalAm, req.body.npdeadline]

                    const qTodeal = `insert into deals (deal_name, reference_no, contact, contact2, agreement_amount, work_name, email, city, oth_details, total_price, np_deadline) values (?,?,?,?,?,?,?,?,?,?,?)`

                    conn.query(qTodeal, dealsTableData, (err1, response) => {
                        if (err1) {
                            res.status(500).send({ msg: "something error occured" })
                            return conn.rollback(function () {
                                throw err1;
                            })
                        }
                        // -------- insert into client tables -----------
                        if (req.body.dataType == 'new') {
                            const clientTableData = [req.body.name, req.body.contactNo, req.body.altContact, req.body.email, req.body.city, req.body.remarks]
                            const qToclient = `INSERT INTO clients (name, contact, contact2, email, location, oth_details) VALUES (?, ?, ?, ?, ?, ?)`
                            transactHandler(qToclient, clientTableData, conn, res, null)
                        }

                        // -------- insert into normal_project_cat tables -----------   
                        const dealId = response.insertId
                        const catTableData = []
                        if (req.body.task && typeof req.body.task === 'object') {
                            req.body.task.forEach((ask) => {
                                const taskNum = Number(ask)
                                catTableData.push([dealId, taskNum, 'not set yet'])
                            })
                        } else { catTableData.push([dealId, req.body.task, 'not set yet']) }

                        const qTonpc = `insert into normal_project_cat (ndeal_id, category_id, dateofdeadline) values ?`
                        conn.query(qTonpc, [catTableData], (err2, response2) => {
                            if (err2) {
                                res.status(500).send({ msg: "something error occured" })
                                return conn.rollback(function () {
                                    throw err2;
                                })
                            }

                            // -------- insert into normal_projects_finance tables -----------
                            const finTableData = [dealId, req.body.TotalAm, req.body.agreementAm]
                            const qTonpf = `insert into normal_projects_finance (ndeal_id, totalamount, amount_got) values (?, ?, ?)`

                            conn.query(qTonpf, finTableData, (err3, response3) => {
                                if (err3) {
                                    res.status(500).send({ msg: "something error occured" })
                                    return conn.rollback(function () {
                                        throw err3;
                                    })
                                }
                                conn.commit(function (errC) {
                                    if (errC) {
                                        res.status(500).send({ msg: "something error occured" })
                                        return conn.rollback(function () {
                                            throw errC;
                                        });
                                    }
                                    res.status(200).send({ msg: "new deal entered successfully..😍" })
                                })
                            })
                        })

                    })
                    conn.release();
                })
            })
        }
    }